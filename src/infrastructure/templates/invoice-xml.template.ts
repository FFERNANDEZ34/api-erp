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
  ubigeoEmisor: string; // Ej: '150115'
  
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
    unidadMedida: string; // 'NIU' o 'ZZ'
    nombre: string;
    precioConIgv: number;
    valorSinIgv: number;
    igvItem: number;
    importeBruto: number;
    taxTypeCode: string; // '10' Gravado, '20' Exonerado
  }>;
}

export const generateInvoiceXmlTemplate = (p: XmlInvoicePayload): string => {
  // 🎯 INMUNIZACIÓN MATEMÁTICA: Agregamos operadores defensivos (|| 0) ante cualquier descalce de variables
  const xmlItems = p.items.map((item, index) => {
    const cantidad = Number(item.cantidad || 0);
    const valorSinIgv = Number(item.valorSinIgv || 0);
    const precioConIgv = Number(item.precioConIgv || 0);
    const igvItem = Number(item.igvItem || 0);

    return `
    <cac:InvoiceLine>
        <cbc:ID>${index + 1}</cbc:ID>
        <cbc:InvoicedQuantity unitCode="${item.unidadMedida || 'NIU'}">${cantidad.toFixed(2)}</cbc:InvoicedQuantity>
        <cbc:LineExtensionAmount currencyID="${p.moneda}">${(valorSinIgv * cantidad).toFixed(2)}</cbc:LineExtensionAmount>
        <cac:PricingReference>
            <cac:AlternativeConditionPrice>
                <cbc:PriceAmount currencyID="${p.moneda}">${precioConIgv.toFixed(2)}</cbc:PriceAmount>
                <cbc:PriceTypeCode>01</cbc:PriceTypeCode>
            </cac:AlternativeConditionPrice>
        </cac:PricingReference>
        <cac:TaxTotal>
            <cbc:TaxAmount currencyID="${p.moneda}">${igvItem.toFixed(2)}</cbc:TaxAmount>
            <cac:TaxSubtotal>
                <cbc:TaxableAmount currencyID="${p.moneda}">${(valorSinIgv * cantidad).toFixed(2)}</cbc:TaxableAmount>
                <cbc:TaxAmount currencyID="${p.moneda}">${igvItem.toFixed(2)}</cbc:TaxAmount>
                <cac:TaxCategory>
                    <cbc:Percent>18.00</cbc:Percent>
                    <cbc:TaxExemptionReasonCode>${item.taxTypeCode || '10'}</cbc:TaxExemptionReasonCode>
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
        </cac:Item>
        <cac:Price>
            <cbc:PriceAmount currencyID="${p.moneda}">${valorSinIgv.toFixed(4)}</cbc:PriceAmount>
        </cac:Price>
    </cac:InvoiceLine>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
         xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
         xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2">
    <ext:UBLExtensions>
        <ext:UBLExtension>
            <ext:ExtensionContent>
                <!-- Firma inyectada en caliente por el SunatSignerService -->
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
                <cbc:ID schemeID="6">${p.rucEmisor}</cbc:ID>
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
                <cbc:ID schemeID="${p.tipoDocCliente}">${p.nroDocCliente}</cbc:ID>
            </cac:PartyIdentification>
            <cac:PartyLegalEntity>
                <cbc:RegistrationName><![CDATA[${p.razonSocialCliente}]]></cbc:RegistrationName>
            </cac:PartyLegalEntity>
        </cac:Party>
    </cac:AccountingCustomerParty>
    <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${p.moneda}">${Number(p.totalIgv || 0).toFixed(2)}</cbc:TaxAmount>
        <cac:TaxSubtotal>
            <cbc:TaxableAmount currencyID="${p.moneda}">${Number(p.totalGravada || 0).toFixed(2)}</cbc:TaxableAmount>
            <cbc:TaxAmount currencyID="${p.moneda}">${Number(p.totalIgv || 0).toFixed(2)}</cbc:TaxAmount>
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
        <cbc:LineExtensionAmount currencyID="${p.moneda}">${Number(p.totalGravada || 0).toFixed(2)}</cbc:LineExtensionAmount>
        <cbc:TaxInclusiveAmount currencyID="${p.moneda}">${Number(p.totalVenta || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
        <cbc:PayableAmount currencyID="${p.moneda}">${Number(p.totalVenta || 0).toFixed(2)}</cbc:PayableAmount>
    </cac:LegalMonetaryTotal>
    ${xmlItems}
</Invoice>`.trim();
};