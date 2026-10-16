export interface Param {
  id: number;
  name: string;
  type: string;
  value: string;
}

export interface Step {
  id: number;
  name: string;
  description: string;
  dependsOn: number | null;
  dependsOnName?: string | null;
  params: Param[];
  createdAt: string;
  createdBy: string | null;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
}
