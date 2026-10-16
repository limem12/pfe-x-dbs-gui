export interface ProductParam {
  id: number;
  name: string;
  type: string;
  value: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  params: ProductParam[];
  preuutStepIds: string[];
  sequenceIds: string[];
  postuutStepIds: string[];
  createdAt: string;
  createdBy: string;
}
