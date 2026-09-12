
export interface EntityCustomer {
  id?: number;
  subscriptionId: number; // Enlace al Tenant global (Holding)
  entityType: 'persona' | 'empresa'; // Clasificación comercial
  documentType: 'dni' | 'ruc' | 'pasaporte' | 'ce' | 'otros'; // Tipo de documento válido en Perú
  documentNumber: string; // Número físico del documento (Ej: 20123456781 o 71625342)
  name: string; // Nombre completo del cliente o Razón Social de la empresa
  email?: string | null; // Correo opcional del contacto de la entidad
}