import { Company } from '../entities/Company';
export interface ICompanyRepository {
  create(company: Company): Promise<Company>;
  findById(id: number): Promise<Company | null>;
}