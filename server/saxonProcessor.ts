// @ts-ignore - saxon-js doesn't have TypeScript declarations
import SaxonJS from 'saxon-js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SaxonTransformResult {
  success: boolean;
  output?: string;
  errors?: string[];
  warnings?: string[];
  processingTime: number;
  outputSize?: number;
}

export interface SaxonValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SaxonProcessor {
  private static instance: SaxonProcessor;
  
  public static getInstance(): SaxonProcessor {
    if (!SaxonProcessor.instance) {
      SaxonProcessor.instance = new SaxonProcessor();
    }
    return SaxonProcessor.instance;
  }

  /**
   * Resolve XSL dependencies by creating symbolic links or copies
   */
  async resolveDependenciesForSaxon(xslPath: string): Promise<void> {
    console.log(`🔍 Saxon resolving dependencies for: ${path.basename(xslPath)}`);
    try {
      const content = await fs.readFile(xslPath, 'utf-8');
      const includeRegex = /<xsl:(include|import)\s+href=["']([^"']+)["'][^>]*>/g;
      const uploadsDir = path.dirname(xslPath);
      
      let match;
      while ((match = includeRegex.exec(content)) !== null) {
        const [, , dependencyPath] = match;
        const targetPath = path.join(uploadsDir, dependencyPath);
        
        // Check if file already exists
        try {
          await fs.access(targetPath);
          console.log(`✅ Saxon dependency already exists: ${dependencyPath}`);
          continue;
        } catch {
          // File doesn't exist, need to find and link it
        }
        
        // Find the dependency file in uploads directory
        const files = await fs.readdir(uploadsDir);
        const matchingFile = files.find(file => {
          // Direct name match
          if (file.includes(dependencyPath)) return true;
          
          // Flexible matching for W2 files
          if (dependencyPath.includes('W2') && dependencyPath.includes('Style.xsl')) {
            return file.includes('W2') && file.includes('Style.xsl') && file.endsWith('.xsl');
          }
          
          // General style file matching
          if (dependencyPath.endsWith('Style.xsl')) {
            return file.endsWith('Style.xsl') && 
                   dependencyPath.split(/[A-Z]/)[0] === file.split(/[A-Z]/)[0];
          }
          
          return false;
        });
        
        if (matchingFile) {
          const sourcePath = path.join(uploadsDir, matchingFile);
          console.log(`🔗 Saxon linking dependency: ${matchingFile} -> ${dependencyPath}`);
          
          try {
            // Read and preprocess the source file to fix HTML entities
            let content = await fs.readFile(sourcePath, 'utf-8');
            
            // Fix common HTML entities that Saxon doesn't recognize
            content = content
              .replace(/&nbsp;/g, '&#160;')  // non-breaking space
              .replace(/&copy;/g, '&#169;')  // copyright
              .replace(/&reg;/g, '&#174;')   // registered trademark
              .replace(/&trade;/g, '&#8482;') // trademark
              .replace(/&amp;/g, '&#38;')    // ampersand (if not already escaped)
              .replace(/&lt;/g, '&#60;')     // less than
              .replace(/&gt;/g, '&#62;');    // greater than
            
            // Write the preprocessed content
            await fs.writeFile(targetPath, content);
            console.log(`✅ Saxon file preprocessed and linked for ${dependencyPath}`);
          } catch (linkError) {
            console.warn(`⚠️  Saxon failed to preprocess ${dependencyPath}:`, linkError);
            // Fallback to simple copy
            try {
              await fs.copyFile(sourcePath, targetPath);
              console.log(`✅ Saxon file copied (no preprocessing) for ${dependencyPath}`);
            } catch (copyError) {
              console.error(`❌ Saxon failed to copy ${dependencyPath}:`, copyError);
            }
          }
        } else {
          console.warn(`⚠️  Saxon dependency not found: ${dependencyPath}`);
        }
      }
    } catch (error) {
      console.error('Saxon dependency resolution error:', error);
    }
  }

  /**
   * Compile XSLT stylesheet to SEF format for optimized processing
   */
  async compileStylesheet(xslPath: string): Promise<string> {
    const sefPath = xslPath.replace(/\.xsl$/, '.sef.json');
    
    try {
      // First resolve dependencies for Saxon
      console.log('🔍 Saxon resolving dependencies...');
      await this.resolveDependenciesForSaxon(xslPath);
      
      // Government forms require document context during compilation
      // Create minimal XML for compilation context
      const minimalXml = path.join(path.dirname(sefPath), 'minimal_context.xml');
      await fs.writeFile(minimalXml, `<?xml version="1.0" encoding="UTF-8"?>
<Return xmlns:irs="http://www.irs.gov/efile" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <ReturnData>
    <W2CM>
      <EmployeeSSN>000000000</EmployeeSSN>
      <EmployeeNm>Test</EmployeeNm>
    </W2CM>
  </ReturnData>
</Return>`);

      // Use xslt3 CLI to compile stylesheet with minimal context
      const { stdout, stderr } = await execAsync(
        `npx xslt3 -xsl:"${xslPath}" -s:"${minimalXml}" -export:"${sefPath}"`
      );

      // Clean up minimal XML
      try {
        await fs.unlink(minimalXml);
      } catch (e) {
        // Ignore cleanup errors
      }
      
      if (stderr && !stderr.includes('Stylesheet compilation time:')) {
        console.warn('Saxon compilation warnings:', stderr);
      }
      
      console.log('Saxon stylesheet compiled:', stdout);
      return sefPath;
    } catch (error) {
      console.error('Saxon compilation failed:', error);
      
      // If compilation succeeded but there are other issues, be more specific
      if (error instanceof Error && error.message.includes('Stylesheet compilation time:')) {
        throw new Error(`Saxon compilation succeeded but transformation setup failed: ${error.message}`);
      }
      
      throw new Error(`Failed to compile stylesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform XSLT transformation using SaxonJS
   */
  async transform(
    xmlPath: string, 
    xslPath: string, 
    outputPath: string
  ): Promise<SaxonTransformResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log(`Saxon transformation starting: ${path.basename(xmlPath)} + ${path.basename(xslPath)}`);

      // Compile stylesheet to SEF if not already done
      let sefPath: string;
      const potentialSefPath = xslPath.replace(/\.xsl$/, '.sef.json');
      
      try {
        await fs.access(potentialSefPath);
        sefPath = potentialSefPath;
        console.log('Using existing SEF file:', path.basename(sefPath));
      } catch {
        console.log('Compiling stylesheet to SEF format...');
        sefPath = await this.compileStylesheet(xslPath);
      }

      // Read XML content directly for reliable processing
      console.log(`🔍 Saxon reading XML source: ${path.basename(xmlPath)}`);
      const xmlContent = await fs.readFile(xmlPath, 'utf-8');
      console.log(`✅ Saxon XML loaded: ${xmlContent.length} characters`);

      // Perform transformation using SaxonJS with source text (more reliable)
      console.log('⚡ Saxon executing industrial-grade XSLT transformation...');
      const result = await SaxonJS.transform({
        stylesheetFileName: sefPath,
        sourceText: xmlContent,
        destination: "serialized"
      }, "async");

      // Write output to file
      if (result.principalResult) {
        await fs.writeFile(outputPath, result.principalResult);
        console.log('Saxon transformation output written to:', path.basename(outputPath));
      } else {
        throw new Error('No transformation result generated');
      }

      // Get output file stats
      const stats = await fs.stat(outputPath);
      const processingTime = Date.now() - startTime;

      console.log(`Saxon transformation completed in ${processingTime}ms, output: ${(stats.size / 1024).toFixed(1)} KB`);

      return {
        success: true,
        output: result.principalResult,
        errors,
        warnings,
        processingTime,
        outputSize: stats.size
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      
      // Enhanced error reporting for transformation phase
      console.error('🚨 Saxon transformation phase failed:', errorMessage);
      if (errorMessage.includes('XTDE0044')) {
        console.error('🔍 XTDE0044 means: No source input supplied for apply-templates invocation');
        console.error('💡 This usually indicates the XML document is not being passed correctly to Saxon');
      }

      return {
        success: false,
        errors,
        warnings,
        processingTime
      };
    }
  }

  /**
   * Validate XML against XSD schema using SaxonJS
   */
  async validateWithSchema(xmlPath: string, xsdPath: string): Promise<SaxonValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log(`Saxon schema validation: ${path.basename(xmlPath)} against ${path.basename(xsdPath)}`);

      // Use xslt3 CLI for schema validation
      const { stdout, stderr } = await execAsync(
        `npx xslt3 -s:"${xmlPath}" -xsd:"${xsdPath}" -quit:on`
      );

      console.log('Saxon validation completed successfully');
      if (stderr) {
        warnings.push(stderr);
      }

      return {
        isValid: true,
        errors,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Schema validation failed';
      errors.push(errorMessage);
      
      console.error('Saxon schema validation failed:', errorMessage);

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Validate XML well-formedness using SaxonJS
   */
  async validateXmlWellFormedness(xmlPath: string): Promise<SaxonValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Load and parse XML to check well-formedness
      await SaxonJS.getResource({
        location: xmlPath,
        type: "xml"
      });

      console.log('Saxon XML well-formedness validation passed');

      return {
        isValid: true,
        errors,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'XML is not well-formed';
      errors.push(errorMessage);
      
      console.error('Saxon XML well-formedness validation failed:', errorMessage);

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Generate XSD schema from XML sample using XPath analysis
   */
  async generateSchemaFromXml(xmlPath: string, outputXsdPath: string): Promise<SaxonValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      console.log(`Saxon schema generation from: ${path.basename(xmlPath)}`);

      // Load XML document
      const doc = await SaxonJS.getResource({
        location: xmlPath,
        type: "xml"
      });

      // Analyze XML structure using XPath
      const rootElement = SaxonJS.XPath.evaluate("/*", doc);
      const allElements = SaxonJS.XPath.evaluate("//*", doc);
      const allAttributes = SaxonJS.XPath.evaluate("//@*", doc);

      // Generate basic XSD structure
      let xsdContent = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           elementFormDefault="qualified">

  <!-- Generated by Saxon Schema Analyzer -->
  <!-- Root element definition -->
`;

      // Add root element definition (simplified)
      if (rootElement && rootElement.length > 0) {
        const rootName = rootElement[0].nodeName;
        xsdContent += `  <xs:element name="${rootName}" type="${rootName}Type"/>

  <xs:complexType name="${rootName}Type">
    <xs:sequence>
      <!-- Child elements would be analyzed here -->
      <xs:any minOccurs="0" maxOccurs="unbounded" processContents="lax"/>
    </xs:sequence>
    <!-- Attributes would be analyzed here -->
    <xs:anyAttribute processContents="lax"/>
  </xs:complexType>

`;
      }

      xsdContent += `</xs:schema>`;

      // Write XSD file
      await fs.writeFile(outputXsdPath, xsdContent);
      
      warnings.push('Generated basic XSD schema - manual refinement recommended for production use');
      console.log('Saxon schema generation completed:', path.basename(outputXsdPath));

      return {
        isValid: true,
        errors,
        warnings
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Schema generation failed';
      errors.push(errorMessage);
      
      console.error('Saxon schema generation failed:', errorMessage);

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Get detailed information about XSLT stylesheet
   */
  async analyzeStylesheet(xslPath: string) {
    try {
      const content = await fs.readFile(xslPath, 'utf-8');
      
      // Basic analysis using XPath expressions
      const doc = await SaxonJS.getResource({
        location: xslPath,
        type: "xml"
      });

      const templates = SaxonJS.XPath.evaluate("//xsl:template", doc);
      const variables = SaxonJS.XPath.evaluate("//xsl:variable", doc);
      const includes = SaxonJS.XPath.evaluate("//xsl:include | //xsl:import", doc);

      return {
        templates: templates.length,
        variables: variables.length,
        includes: includes.length,
        size: content.length,
        version: SaxonJS.XPath.evaluate("/*/@version", doc)?.[0]?.nodeValue || 'unknown'
      };

    } catch (error) {
      console.error('Saxon stylesheet analysis failed:', error);
      return null;
    }
  }
}