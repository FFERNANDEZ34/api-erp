import { EntityModel } from "../../../infrastructure/database/models/entity.model";
import { AuxiliaryParameterModel } from "../../../infrastructure/database/models/auxiliary-parameter.model"; // 🚀 ¡AÑADIDO!: Importamos el modelo paramétrico

export class CreateEntityUseCase {
  async execute(data: {
    subscriptionId: number;
    entityType: string;    // 'persona' o 'empresa'
    documentType: string;   // Recibe el 'code' (Ej: '1', '6', etc.)
    documentNumber: string;
    name: string;
    email: string | null;
    address?: string;
    phone?: string;
  }): Promise<EntityModel> {

    console.log('=============== 🕵️‍♂️ RADAR BACKEND: REGISTRANDO ENTIDAD DINÁMICA ===============');
    console.log('Payload recibido en el Caso de Uso (data):', JSON.stringify(data, null, 2));

    // 1. Blindaje y sanitización nativa de variables
    const type = data.entityType ? String(data.entityType).trim().toLowerCase() : 'persona';
    const docTypeInput = data.documentType ? String(data.documentType).trim() : '';
    const docNumber = data.documentNumber ? String(data.documentNumber).trim() : '';

    // =========================================================================
    // 🛰️ CONSULTA EN CALIENTE: Recuperamos los parámetros reales de MySQL
    // =========================================================================
    // Traemos de golpe todos los tipos de documentos de identidad activos de este holding específico
    const activeParameters = await AuxiliaryParameterModel.findAll({
      where: {
        subscriptionId: data.subscriptionId,
        parameterType: 'TIPO_DOCUMENTO_IDENTIDAD',
        isActive: true
      },
      raw: true
    });

    console.log(`Parámetros dinámicos rescatados de la BD para el holding [${data.subscriptionId}]:`, activeParameters.map(p => p.code));

    // 2. Extraemos el código exacto registrado para el RUC buscando por su glosa/nombre oficial en la BD
    const rucParameter = activeParameters.find(p => String(p.code).trim() === '6');
    const rucCode = rucParameter ? String(rucParameter.code).trim() : '6';

    // 3. Extraemos todos los códigos que NO sean RUC (DNI, Pasaporte, CE, etc.) para la validación de personas
    const allowedPersonDocs = activeParameters
      .map(p => String(p.code).trim())
      .filter(code => code !== '6');

    // Fallback preventivo si la tabla paramétrica estuviera temporalmente vacía
    if (allowedPersonDocs.length === 0) {
      allowedPersonDocs.push('1', '4', '7', '0');
    }

    console.log(`Evaluación de Reglas de Negocio -> RUC Code: [${rucCode}] | Allowed Person Docs:`, allowedPersonDocs);

    // =========================================================================
    // ⚖️ APLICACIÓN DE REGLAS DE NEGOCIO GOVERNADAS POR LA BASE DE DATOS
    // =========================================================================
    
    // Regla Persona: Validamos contra la colección mutada en caliente desde MySQL
    if (type === 'persona') {
      if (!allowedPersonDocs.includes(docTypeInput)) {
        console.warn(`❌ Rechazado: El documento ingresado [${docTypeInput}] no pertenece a la matriz dinámica de personas.`);
        throw new Error('Las entidades de tipo persona deben registrarse con un documento de identidad válido (DNI, Pasaporte o CE).');
      }
    }

    // Regla Empresa: Validamos dinámicamente contra el código de RUC recuperado de la BD
    if (type === 'empresa' && docTypeInput !== rucCode) {
      console.warn(`❌ Rechazado: Intento de registrar empresa con un código diferente al RUC paramétrico [${rucCode}]. Recibido: [${docTypeInput}]`);
      throw new Error('Las entidades de tipo empresa deben registrarse estrictamente bajo un número de RUC comercial válido.');
    }

    // 4. Validar duplicidad únicamente dentro de la misma suscripción global multi-tenant
    const exists = await EntityModel.findOne({
      where: {
        subscriptionId: data.subscriptionId,
        documentType: docTypeInput,
        documentNumber: docNumber,
      },
    });

    if (exists) {
      console.warn(`❌ Rechazado: El documento ${docNumber} ya existe en el catálogo.`);
      throw new Error(`La entidad con número de documento ${docNumber} ya se encuentra registrada en su catálogo compartido.`);
    }

    console.log('🚀 payload verificado con éxito rotundo. Insertando registro en MySQL...');
    
    // 🛡️ FILTRO DE PROPIEDADES NULAS:
    // Creamos el objeto final omitiendo explícitamente cualquier clave que valga null o undefined
    const cleanInsertData: any = {
      subscriptionId: data.subscriptionId,
      entityType: type,
      documentType: docTypeInput,
      documentNumber: docNumber,
      name: data.name.trim()
    };

    if (data.email && String(data.email).trim() !== '') cleanInsertData.email = String(data.email).trim();
    if (data.address && String(data.address).trim() !== '') cleanInsertData.address = String(data.address).trim();
    if (data.phone && String(data.phone).trim() !== '') cleanInsertData.phone = String(data.phone).trim();

    console.log('Payload final depurado para MySQL:', JSON.stringify(cleanInsertData, null, 2));


    // 5. Persistencia final atómica
    return await EntityModel.create(cleanInsertData);
  }
}