import { DataTypes, Model } from 'sequelize';
import { sequelizeInstance } from '../sequelize.config';
import { AttachmentModel } from './attachment.model'; // 🚀 Importación de tu tabla centralizada de adjuntos polimórficos

export class CompanyModel extends Model {
  declare public id: number;
  declare public subscriptionId: number;
  declare public ruc: string;
  declare public name: string;
  declare public address: string | null;
  declare public phone: string | null;
  declare public email: string | null;
  declare public sunatUser: string | null;          // Usuario SOL SECUNDARIO SUNAT
  declare public sunatPassword: string | null;      // Contraseña / Clave SOL
  declare public certificatePassword: string | null; // Contraseña Privada de Firma Digital (.pfx)
  declare public isActive: boolean;

  // =========================================================================
  // 🏢 CAMPOS FISCALES EXIGIDOS NATIVAMENTE POR LA SUNAT
  // =========================================================================
  declare public commercialName: string | null;
  declare public ubigeo: string | null;

  // =========================================================================
  // 🖼️ INTERFAZ RELACIONAL MULTI-MEDIA POLIMÓRFICA EN LA RAM
  // Almacena el arreglo de adjuntos filtrados para la empresa (Certificado, Logo)
  // =========================================================================
  declare public CompanyFiles?: AttachmentModel[];
}

CompanyModel.init(
  {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    subscriptionId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
    },
    ruc: { 
      type: DataTypes.STRING(11), 
      allowNull: false 
    },
    name: { 
      type: DataTypes.STRING(150), 
      allowNull: false 
    },
    address: { 
      type: DataTypes.STRING(255), 
      allowNull: true 
    },
    phone: { 
      type: DataTypes.STRING(20), 
      allowNull: true 
    },
    email: { 
      type: DataTypes.STRING(100), 
      allowNull: true 
    },
    sunatUser: { 
      type: DataTypes.STRING(50), 
      allowNull: true 
    },
    sunatPassword: { 
      type: DataTypes.STRING(100), 
      allowNull: true 
    },
    certificatePassword: { 
      type: DataTypes.STRING(100), 
      allowNull: true 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true 
    },

    // =========================================================================
    // ⚙️ ADAPTACIÓN DE COLUMNAS PARA EL EMBARQUE DE FACTURACIÓN ELECTRÓNICA
    // =========================================================================
    commercialName: { 
      type: DataTypes.STRING(150), 
      allowNull: true 
    },
    ubigeo: { 
      type: DataTypes.STRING(6), 
      allowNull: true, 
      defaultValue: '150101' // Equivale a Lima Cercado por defecto de acuerdo al catálogo nacional
    }
  },
  {
    sequelize: sequelizeInstance,
    tableName: 'companies',
    timestamps: true
  }
);

// =========================================================================
// 🔌 EL ENGANCHE POLIMÓRFICO INDUSTRIAL DE ADJUNTOS MASTER
// Vinculamos la empresa con tu tabla central 'sys_attachments' inyectando
// un cortafuegos estricto de consulta (scope) para aislar datos.
// =========================================================================
CompanyModel.hasMany(AttachmentModel, {
  foreignKey: 'relatedRecordId', // Se mapea contra el ID del registro de la tabla companies
  as: 'CompanyFiles',            // Mantiene el alias exacto que consume tu Use Case en el findOne
  constraints: false,
  scope: {
    relatedModule: 'COMPANIAS'   // 🛡️ CORTAFUEGOS: Sequelize forzará a traer solo adjuntos del módulo de empresas
  }
});