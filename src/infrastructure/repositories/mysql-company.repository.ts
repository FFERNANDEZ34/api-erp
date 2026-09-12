import { ICompanyRepository } from '../../domain/repositories/company.repository';
import { Company } from '../../domain/entities/Company';
import { CompanyModel } from '../database/models/company.model';

export class MySqlCompanyRepository implements ICompanyRepository {
  async create(company: Company): Promise<Company> {
    const created = await CompanyModel.create({
      name: company.name,
      employeeCount: company.employeeCount,
      contactName: company.contactName,
      contactEmail: company.contactEmail
    });
    
    // Al usar .toJSON() se extraen los valores finales de la BD incluyendo el ID real
    return created.toJSON() as Company;
  }

  async findById(id: number): Promise<Company | null> {
    const found = await CompanyModel.findByPk(id);
    return found ? (found.toJSON() as Company) : null;
  }
}