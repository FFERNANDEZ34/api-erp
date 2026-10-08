export interface XmlInvoicePayload {
  rucEmisor: string;
  tipoComprobante: string; // '01' Factura, '03' Boleta
  serieComprobante: string; // Ej: F001
  correlativoComprobante: string; // Ej: 00000001
  fechaEmision: string; // YYYY-MM-DD
  horaEmision: string; // HH:MM:SS
  moneda: string; // 'PEN' o 'USD'
  
  // Emisor (Tu Holding)
  razonSocialEmisor: string;
  nombreComercialEmisor: string;
  direccionEmisor: string;
  ubigeoEmisor: string; // Ej: '150115' (Ate)
  
  // Adquiriente (Cliente)
  tipoDocCliente: string; // '1' DNI, '6' RUC
  nroDocCliente: string;
  razonSocialCliente: string;
  direccionCliente?: string;

  // Totales Globales
  totalGravada: number;
  totalIgv: number;
  totalVenta: number;
  totalLetras: string;

  // Carrito de Ítems
  items: Array<{
    id: number;
    cantidad: number;
    unidadMedida: string; // 'NIU' o 'ZZ' (Servicio)
    nombre: string;
    precioConIgv: number;
    valorSinIgv: number;
    igvItem: number;
    importeBruto: number;
    taxTypeCode: string; // '10' Gravado, '20' Exonerado
  }>;
}

export const generateInvoiceXmlTemplate = (p: XmlInvoicePayload): string => {
  // Iteración limpia y peso pluma de los productos/servicios en la plantilla
  const xmlItems = p.items.map((item, index) => `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${item.unidadMedida}">${item.cantidad.toFixed(2)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${p.moneda}">${(item.valorSinIgv * item.cantidad).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="${p.moneda}">${item.precioConIgv.toFixed(2)}</cbc:PriceAmount>
                <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${p.moneda}">${item.igvItem.toFixed(2)}</cac:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="${p.moneda}">${(item.valorSinIgv * item.cantidad).toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="${p.moneda}">${item.igvItem.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:Percent>18.00</cbc:Percent>
                    <cbc:TaxExemptionReasonCode>${item.taxTypeCode}</cbc:TaxExemptionReasonCode>
                    <cac:TaxScheme>
                        <cbc:ID>1000</cbc:ID>
                        <cbc:Name>IGV</cbc:Name>
                        <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                    </cac:TaxScheme>
                </cac:TaxCategory>
            </cac:TaxSubtotal>
        </cac:TaxTotal>
        <cac:Item>
            <cbc:Description><![CDATA[${item.nombre}]]></cbc:Description>
        </cac:cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${p.moneda}">${item.valorSinIgv.toFixed(4)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`).join('');

  // Retornamos el XML UBL 2.1 estructurado de forma quirúrgica como String Plano
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://w3.org"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <!-- Aquí el firmador inyectará el nodo ds:Signature de forma criptográfica -->
            </ext:ExtensionContent>
        </ext:UBLExtension>
    </ext:UBLExtensions>
    <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
    <cbc:CustomizationID>2.0</cbc:CustomizationID>
    <cbc:ID>${p.serieComprobante}-${p.correlativoComprobante}</cbc:ID>
    <cbc:IssueDate>${p.fechaEmision}</cbc:IssueDate>
    <cbc:IssueTime>${p.horaEmision}</cbc:IssueTime>
    <cbc:InvoiceTypeCode listID="0101">${p.tipoComprobante}</cbc:InvoiceTypeCode>
    <cbc:DocumentCurrencyCode>${p.moneda}</cbc:DocumentCurrencyCode>
    <cac:Signature>
        <cbc:ID>${p.rucEmisor}</cbc:ID>
        <cac:SignatoryParty>
            <cac:PartyIdentification>
                <cbc:ID>${p.rucEmisor}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name><![CDATA[${p.razonSocialEmisor}]]></cbc:Name>
            </cac:PartyName>
        </cac:SignatoryParty>
        <cac:DigitalSignatureAttachment>
            <cac:ExternalReference>
                <cbc:URI>#SIGN-${p.rucEmisor}</cbc:URI>
            </cac:ExternalReference>
        </cac:DigitalSignatureAttachment>
    </cac:Signature>
    <cac:AccountingSupplierParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID listID="6">${p.rucEmisor}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyName>
                <cbc:Name><![CDATA[${p.nombreComercialEmisor}]]></cbc:Name>
            </cac:PartyName>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${p.razonSocialEmisor}]]></cbc:RegistrationName>
                <cac:RegistrationAddress>
                    <cbc:ID>${p.ubigeoEmisor}</cbc:ID>
                    <cbc:AddressLine>
                        <cbc:Line><![CDATA[${p.direccionEmisor}]]></cbc:Line>
                    </cbc:AddressLine>
                    <cac:Country>
                        <cbc:IdentificationCode>PE</cbc:IdentificationCode>
                    </cac:Country>
                </cac:RegistrationAddress>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingSupplierParty>
    <cac:AccountingCustomerParty>
        <cac:Party>
            <cac:PartyIdentification>
                <cbc:ID listID="${p.tipoDocCliente}">${p.nroDocCliente}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${p.razonSocialCliente}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${p.moneda}">${p.totalIgv.toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${p.moneda}">${p.totalGravada.toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${p.moneda}">${p.totalIgv.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxCategory>
                <cac:TaxScheme>
                    <cbc:ID>1000</cbc:ID>
                    <cbc:Name>IGV</cbc:Name>
                    <cbc:TaxTypeCode>VAT</cbc:TaxTypeCode>
                </cac:TaxScheme>
            </cac:TaxCategory>
        </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:LegalMonetaryTotal>
        <cbc:LineExtensionAmount currencyID="${p.moneda}">${p.totalGravada.toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="${p.moneda}">${p.totalVenta.toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${p.moneda}">${p.totalVenta.toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${xmlItems}
</Invoice>`.trim();
};