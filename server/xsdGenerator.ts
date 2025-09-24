import fs from 'fs/promises';
import * as xslt from 'xslt-processor';

interface ElementInfo {
  name: string;
  attributes: Set<string>;
  children: Set<string>;
  hasText: boolean;
  isRepeated: boolean;
}

export async function generateXsdFromXml(xmlFilePath: string): Promise<string> {
  try {
    const xmlContent = await fs.readFile(xmlFilePath, 'utf-8');
    const xmlParser = new xslt.XmlParser();
    const xmlDoc = xmlParser.xmlParse(xmlContent);
    
    // Extract root namespace and target namespace
    const rootElement = xmlContent.match(/<([^>\s\/]+)[^>]*>/)?.[1] || 'root';
    const namespaceMatch = xmlContent.match(/xmlns(?::(\w+))?="([^"]+)"/);
    const targetNamespace = namespaceMatch?.[2] || 'http://example.com/schema';
    const prefix = namespaceMatch?.[1] || 'tns';
    
    // Analyze XML structure
    const elements = new Map<string, ElementInfo>();
    analyzeXmlStructure(xmlContent, elements);
    
    // Generate XSD
    let xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="${targetNamespace}"
           xmlns:${prefix}="${targetNamespace}"
           elementFormDefault="qualified">

  <!-- Root element -->
  <xs:element name="${rootElement}" type="${prefix}:${rootElement}Type"/>

`;

    // Generate complex types for each element
    for (const [elementName, info] of Array.from(elements.entries())) {
      if (info.children.size > 0 || info.attributes.size > 0) {
        xsd += `  <!-- Complex type for ${elementName} -->
  <xs:complexType name="${elementName}Type">`;

        if (info.hasText && info.children.size > 0) {
          xsd += `
    <xs:complexContent>
      <xs:extension base="xs:string">
        <xs:sequence>`;
        } else if (info.children.size > 0) {
          xsd += `
    <xs:sequence>`;
        }

        // Add child elements
        for (const child of Array.from(info.children)) {
          const childInfo = elements.get(child);
          const occurs = childInfo?.isRepeated ? ' maxOccurs="unbounded"' : '';
          const childType = elements.has(child) && (elements.get(child)!.children.size > 0 || elements.get(child)!.attributes.size > 0)
            ? `${prefix}:${child}Type`
            : 'xs:string';
          
          xsd += `
      <xs:element name="${child}" type="${childType}"${occurs}/>`;
        }

        if (info.hasText && info.children.size > 0) {
          xsd += `
        </xs:sequence>
      </xs:extension>
    </xs:complexContent>`;
        } else if (info.children.size > 0) {
          xsd += `
    </xs:sequence>`;
        }

        // Add attributes
        for (const attr of Array.from(info.attributes)) {
          xsd += `
    <xs:attribute name="${attr}" type="xs:string" use="optional"/>`;
        }

        xsd += `
  </xs:complexType>

`;
      }
    }

    xsd += `</xs:schema>`;
    return xsd;

  } catch (error) {
    throw new Error(`Failed to generate XSD: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateXsdFromXsl(xslFilePath: string): Promise<string> {
  try {
    const xslContent = await fs.readFile(xslFilePath, 'utf-8');
    
    // Extract information from XSL templates and match patterns
    const elements = new Set<string>();
    const attributes = new Set<string>();
    
    // Find match patterns - these indicate expected XML structure
    const matchPatterns = xslContent.match(/match="([^"]+)"/g) || [];
    matchPatterns.forEach(match => {
      const pattern = match.replace('match="', '').replace('"', '');
      // Extract element names from XPath patterns
      const elementMatches = pattern.match(/\b([a-zA-Z][a-zA-Z0-9]*)\b/g) || [];
      elementMatches.forEach(el => {
        if (!['text', 'node', 'document'].includes(el.toLowerCase())) {
          elements.add(el);
        }
      });
    });

    // Find select statements - these indicate XML structure being accessed
    const selectPatterns = xslContent.match(/select="([^"]+)"/g) || [];
    selectPatterns.forEach(select => {
      const pattern = select.replace('select="', '').replace('"', '');
      // Extract element and attribute names
      const elementMatches = pattern.match(/\b([a-zA-Z][a-zA-Z0-9]*)\b/g) || [];
      elementMatches.forEach(el => {
        if (!['text', 'node', 'position', 'last', 'count'].includes(el.toLowerCase())) {
          if (pattern.includes('@' + el)) {
            attributes.add(el);
          } else {
            elements.add(el);
          }
        }
      });
    });

    // Find value-of statements
    const valueOfPatterns = xslContent.match(/<xsl:value-of select="([^"]+)"/g) || [];
    valueOfPatterns.forEach(valueOf => {
      const select = valueOf.match(/select="([^"]+)"/)?.[1] || '';
      if (select.includes('@')) {
        const attr = select.replace(/.*@/, '').replace(/\[.*\]/, '');
        attributes.add(attr);
      }
    });

    // Determine root element (often from first template match)
    const firstMatch = xslContent.match(/template match="\/([^"\/\s]+)/)?.[1] || 'root';
    
    const targetNamespace = 'http://example.com/schema';
    const prefix = 'tns';
    
    let xsd = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="${targetNamespace}"
           xmlns:${prefix}="${targetNamespace}"
           elementFormDefault="qualified">

  <!-- Schema reverse-engineered from XSL file -->
  <!-- Root element -->
  <xs:element name="${firstMatch}" type="${prefix}:${firstMatch}Type"/>

  <!-- Root complex type -->
  <xs:complexType name="${firstMatch}Type">
    <xs:sequence>`;

    // Add discovered elements
    Array.from(elements).filter(el => el !== firstMatch).forEach(element => {
      xsd += `
      <xs:element name="${element}" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>`;
    });

    xsd += `
    </xs:sequence>`;

    // Add discovered attributes
    Array.from(attributes).forEach(attr => {
      xsd += `
    <xs:attribute name="${attr}" type="xs:string" use="optional"/>`;
    });

    xsd += `
  </xs:complexType>

  <!-- Note: This is a basic schema generated from XSL analysis -->
  <!-- You may need to refine element types, cardinalities, and structure -->

</xs:schema>`;

    return xsd;

  } catch (error) {
    throw new Error(`Failed to generate XSD from XSL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function analyzeXmlStructure(xmlContent: string, elements: Map<string, ElementInfo>) {
  // Parse XML and extract structure information
  // This is a simplified analysis - in production, you'd use a proper XML parser
  
  // Find all elements with regex
  const elementMatches = xmlContent.match(/<([^\/\s>!?][^>\s]*)(?:\s[^>]*)?>[\s\S]*?<\/\1>|<([^\/\s>!?][^>\s\/]*)(?:\s[^>]*)?\/>/g) || [];
  
  elementMatches.forEach(match => {
    const elementMatch = match.match(/<([^\/\s>!?][^>\s]*)/);
    if (!elementMatch) return;
    
    const elementName = elementMatch[1];
    
    if (!elements.has(elementName)) {
      elements.set(elementName, {
        name: elementName,
        attributes: new Set(),
        children: new Set(),
        hasText: false,
        isRepeated: false
      });
    }
    
    const info = elements.get(elementName)!;
    
    // Check for attributes
    const attrMatches = match.match(/\s([a-zA-Z][a-zA-Z0-9]*)\s*=/g) || [];
    attrMatches.forEach(attr => {
      const attrName = attr.trim().replace('=', '');
      info.attributes.add(attrName);
    });
    
    // Check for text content (simplified)
    const hasText = match.includes('>') && !match.match(/<[^>]+>/g)?.every(tag => 
      tag.startsWith('</') || tag.endsWith('/>')
    );
    if (hasText) info.hasText = true;
    
    // Check for child elements (simplified)
    const childMatches = match.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
    childMatches.forEach(child => {
      const childName = child.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1];
      if (childName && childName !== elementName) {
        info.children.add(childName);
      }
    });
  });
  
  // Check for repeated elements
  const allElementNames = Array.from(elements.keys());
  allElementNames.forEach(name => {
    const regex = new RegExp(`<${name}[^>]*>`, 'g');
    const matches = xmlContent.match(regex) || [];
    if (matches.length > 1) {
      elements.get(name)!.isRepeated = true;
    }
  });
}