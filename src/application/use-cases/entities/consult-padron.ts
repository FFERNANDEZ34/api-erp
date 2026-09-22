import axios from 'axios';

export class ConsultPadronUseCase {
  // 🚀 TOKEN REFORZADO DE INFRAESTRUCTURA DE DESARROLLO / PRODUCCIÓN API PERÚ
  // (En producción recuerda mapearlo directamente desde tu archivo .env)
  private readonly API_TOKEN = 'token_fiel_produccion_api_peru_2026_x991'; 
  
  // 🎯 ENDPOINTS OFICIALES DE CONEXIÓN PURA MEDIANTE PARÁMETROS QUERY
  private readonly BASE_URL = 'https://apiperu.dev';

  async execute(documentType: string, documentNumber: string) {
    const docTypeStr = String(documentType).trim();
    const docNumStr = String(documentNumber).trim();

    console.log(`📡 [BÚNKER DE DATOS CERTIFICADO QUERY] Tipo: [${docTypeStr}] | Número: [${docNumStr}]`);

    try {
      // =========================================================================
      // 🏢 CASO 1: CONSULTA DE RUC COMERCIAL (SUNAT DIRECTO VIA QUERY)
      // =========================================================================
      if (docTypeStr === '6') {
        if (docNumStr.length !== 11) throw new Error('El RUC comercial debe contener exactamente 11 dígitos.');
        
        // 🎯 EL DESTRABE REAL: Pasamos el número usando el parámetro query ?numero= exigido por apiperu.dev
        const response = await axios.get(`${this.BASE_URL}/ruc?numero=${docNumStr}`, {
          headers: {
            'Authorization': `Bearer ${this.API_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        const resBody = response.data;
        // APIperu suele estructurar como { success: true, data: { ... } }
        const data = resBody.data || resBody;

        if (!data || (!data.razon_social && !data.nombre_o_razon_social)) {
          throw new Error('El RUC ingresado no existe o se encuentra de baja en los padrones de SUNAT.');
        }

        console.log('🕵️‍♂️ Payload RUC Privado recibido con éxito:', data);

        return {
          success: true,
          name: String(data.razon_social || data.nombre_o_razon_social || data.nombre || '').toUpperCase(),
          address: String(data.direccion || data.direccion_fiscal || 'DIRECCIÓN FISCAL NO ESPECIFICADA').toUpperCase(),
          estado: data.estado || 'ACTIVO',
          condicion: data.condicion || 'HABIDO'
        };
      }

      // =========================================================================
      // 👤 CASO 2: CONSULTA DE DNI NATURAL (RENIEC DIRECTO VIA QUERY)
      // =========================================================================
      if (docTypeStr === '1') {
        if (docNumStr.length !== 8) throw new Error('El DNI debe contener exactamente 8 dígitos.');

        // 🎯 EL DESTRABE REAL: Pasamos el número usando el parámetro query ?numero= exigido por apiperu.dev
        const response = await axios.get(`${this.BASE_URL}/dni?numero=${docNumStr}`, {
          headers: {
            'Authorization': `Bearer ${this.API_TOKEN}`,
            'Accept': 'application/json'
          }
        });

        const resBody = response.data;
        const data = resBody.data || resBody;

        if (!data || (!data.nombre_completo && !data.nombres)) {
          throw new Error('El DNI ingresado no corresponde a ninguna persona en el padrón electoral activo.');
        }

        console.log('🕵️‍♂️ Payload DNI Privado recibido con éxito:', data);

        // Reconstruimos el nombre unificado soportando snake_case nativo del estándar JSON de APIPerú
        const fullName = data.nombre_completo || `${data.nombres || ''} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`;

        return {
          success: true,
          name: String(fullName).replace(/\s+/g, ' ').trim().toUpperCase(),
          address: 'DIRECCIÓN PROTEGIDA POR REGLAMENTO DE PRIVACIDAD RENIEC',
          estado: 'ACTIVO',
          condicion: 'HABIDO'
        };
      }

      throw new Error('Tipo de documento no soportado en este canal transaccional.');

    } catch (error: any) {
      console.error('❌ Excepción crítica en pasarela de datos QUERY:', error?.response?.data || error.message);
      
      const apiMessage = error?.response?.data?.message || error?.response?.data?.error || error.message;
      throw new Error(apiMessage || 'La base de datos nacional no respondió al llamado. Ingrese los datos de forma manual.');
    }
  }
}