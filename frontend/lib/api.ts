export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api"
).replace(/\/$/, "");

function stripApiSuffix(value: string): string {
  return value.replace(/\/api\/?$/i, "").replace(/\/$/, "");
}

export function buildApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
}

export function buildAssetUrl(assetPath: string | null | undefined): string {
  const normalizedAssetPath = assetPath?.trim();

  if (!normalizedAssetPath) {
    return "";
  }

  if (
    /^https?:\/\//i.test(normalizedAssetPath) ||
    normalizedAssetPath.startsWith("data:") ||
    normalizedAssetPath.startsWith("blob:")
  ) {
    return normalizedAssetPath;
  }

  const normalizedPath = normalizedAssetPath.startsWith("/")
    ? normalizedAssetPath
    : `/${normalizedAssetPath}`;
  const assetBaseUrl = stripApiSuffix(API_BASE_URL);

  return assetBaseUrl ? `${assetBaseUrl}${normalizedPath}` : normalizedPath;
}

export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) {
      localStorage.setItem("auth_token", token);
    } else {
      localStorage.removeItem("auth_token");
    }
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("auth_token");
  }

  return null;
}

type ApiErrorPayload = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function formatApiErrorMessage(payload: unknown): string {
  if (typeof payload === "string") {
    return payload.trim() || "Erreur API";
  }

  if (payload && typeof payload === "object") {
    const errorPayload = payload as ApiErrorPayload;
    const message = Array.isArray(errorPayload.message)
      ? errorPayload.message.join(", ")
      : errorPayload.message;

    return String(
      message || errorPayload.error || errorPayload.statusCode || "Erreur serveur",
    ).trim();
  }

  return "Erreur reseau";
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const isFormDataBody =
    typeof FormData !== "undefined" && options?.body instanceof FormData;

  if (!isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorData: unknown = { message: "Erreur reseau" };

    try {
      const errorText = (await response.text()).trim();
      if (errorText.length > 0) {
        errorData = JSON.parse(errorText);
      }
    } catch {
      errorData = { message: "Erreur serveur" };
    }

    const message = formatApiErrorMessage(errorData) || "Erreur API";
    const isRecoverableUnauthorized =
      response.status === 401 &&
      ["Mot de passe actuel incorrect", "Utilisateur non trouve"].includes(
        message,
      );

    if (response.status === 401 && !isRecoverableUnauthorized) {
      setAuthToken(null);

      if (typeof window !== "undefined") {
        window.location.href = "/";
      }

      throw new Error("Session expiree");
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export interface Param {
  id?: string | number;
  name: string;
  type?: string;
  value?: string;
}

export interface Step {
  id: number;
  name: string;
  description: string;
  dependsOn?: number | null;
  dependsOnName?: string | null;
  params: Param[];
  createdAt: string;
  createdBy?: string | null;
  modifiedBy?: string | null;
  modifiedAt?: string | null;
}

type StepMutationPayload = Partial<Step> & {
  auditUser?: string;
};

export interface Sequence {
  id: number;
  name: string;
  description: string;
  stepIds: string[];
  createdAt: string;
  createdBy: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  params: Param[];
  preuutStepIds: string[];
  sequenceIds: string[];
  postuutStepIds: string[];
  createdAt: string;
  createdBy: string;
}

function normalizeProductPayload(data: Partial<Product>): Partial<Product> {
  if (!Array.isArray(data.params)) {
    return data;
  }

  return {
    ...data,
    params: data.params.map((param) => ({
      ...param,
      id: param.id == null ? undefined : String(param.id),
      value: param.value == null ? undefined : String(param.value),
    })),
  };
}

export interface Right {
  id_right: string;
  description: string;
  module?: string | null;
  created_at: string;
}

export interface CreateRightPayload {
  id_right: string;
  description?: string;
  module?: string | null;
}

export interface UpdateRightPayload {
  description?: string;
  module?: string | null;
}

export interface Role {
  id_role: string;
  description: string;
  rights: string[];
  created_at: string;
  updated_at: string;
}

export interface User {
  username: string;
  role: string;
  rights: string[];
  status: "ENABLED" | "DISABLED";
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  lastLogin?: string | null;
  createdAt: string;
}

export interface CreateUserPayload {
  username: string;
  password: string;
  role?: string;
  email?: string;
  phone?: string;
  address?: string;
  avatar?: string;
}

export interface UpdateUserPayload {
  username?: string;
  password?: string;
  role?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  avatar?: string | null;
  status?: "ENABLED" | "DISABLED";
}

export interface CreateRolePayload {
  id_role: string;
  description: string;
  rights: string[];
}

export interface UpdateRolePayload {
  description?: string;
  rights?: string[];
}

export interface HistoryEntry {
  id: number;
  user: string;
  avatar?: string | null;
  action: string;
  entity: string;
  details: string;
  date: string;
}

export interface UploadAvatarResponse {
  avatarUrl: string;
}

export interface ExecutionMode {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface StepConfig {
  id: number;
  name: string;
  description: string;
  depends_on: number | null;
  depends_on_name?: string;
  created_at: string;
  created_by?: string | null;
  modified_by?: string | null;
  modified_at?: string | null;
}

export interface StepParam {
  id: number;
  step_id: number;
  step_name?: string;
  param_name: string;
  param_type: "float" | "int" | "string" | "boolean";
  default_value: string;
  created_at: string;
}

export interface StepLimit {
  id: number;
  step_id: number;
  step_name?: string;
  limit_name: string;
  limit_type: "PASS_FAIL" | "NUMERIC" | "STRING" | "BOOLEAN";
  comparison_type: "EQ" | "NEQ" | "GT" | "GTE" | "LT" | "LTE" | "RANGE";
  limit_value?: string;
  limit_min?: string;
  limit_max?: string;
  unit?: string;
  description?: string;
  created_at: string;
  modified_by?: string | null;
  modified_at?: string | null;
}

export interface SequenceConfig {
  id: number;
  name: string;
  description: string;
  depends_on: number | null;
  depends_on_name?: string;
  created_at: string;
}

export interface SequenceStep {
  id: number;
  sequence_id: number;
  sequence_name?: string;
  step_id: number;
  step_name?: string;
  order_index: number;
  created_at: string;
}

export interface ProductSequence {
  id: number;
  product_id: number;
  product_name?: string;
  sequence_id: number;
  sequence_name?: string;
  order_index: number;
  created_at: string;
}

export interface ProductStepParam {
  id: number;
  product_id: number;
  product_name?: string;
  step_param_id: number;
  param_name?: string;
  value: string;
  created_at: string;
}

export interface ComponentInstance {
  id: number;
  product_id: number;
  product_name?: string;
  step_id: number;
  step_name?: string;
  instance_index: number;
  instance_name: string;
  description?: string | null;
  physical_ref?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ProductStepLimit {
  id: number;
  component_instance_id: number;
  product_id?: number;
  product_name?: string;
  step_id?: number;
  step_name?: string;
  instance_index?: number;
  instance_name?: string;
  physical_ref?: string | null;
  step_limit_id: number;
  limit_name?: string;
  limit_type?: StepLimit["limit_type"];
  comparison_type?: StepLimit["comparison_type"];
  default_limit_value?: string | null;
  default_limit_min?: string | null;
  default_limit_max?: string | null;
  unit?: string | null;
  limit_value?: string | null;
  limit_min?: string | null;
  limit_max?: string | null;
  is_active: boolean;
  execution_mode_id?: number | null;
  mode_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductExecutionConfig {
  id: number;
  product_id: number;
  product_name?: string;
  execution_mode_id: number;
  mode_name?: string;
  sequence_id: number | null;
  sequence_name?: string;
  step_id: number | null;
  step_name?: string;
  is_active: boolean;
  ignore_fail: boolean;
  retry_on_fail: number;
  repeat_count: number;
  retry_delay_ms: number;
  created_at: string;
}

export const stepsApi = {
  getAll: () => request<Step[]>("/steps"),
  getOne: (id: number) => request<Step>(`/steps/${id}`),
  create: (data: StepMutationPayload) =>
    request<Step>("/steps", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: StepMutationPayload) =>
    request<Step>(`/steps/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/steps/${id}`, { method: "DELETE" }),
};

export const sequencesApi = {
  getAll: () => request<Sequence[]>("/sequences"),
  getOne: (id: number) => request<Sequence>(`/sequences/${id}`),
  create: (data: Partial<Sequence>) =>
    request<Sequence>("/sequences", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<Sequence>) =>
    request<Sequence>(`/sequences/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/sequences/${id}`, { method: "DELETE" }),
};

export const productsApi = {
  getAll: () => request<Product[]>("/products"),
  getOne: (id: number) => request<Product>(`/products/${id}`),
  create: (data: Partial<Product>) =>
    request<Product>("/products", {
      method: "POST",
      body: JSON.stringify(normalizeProductPayload(data)),
    }),
  update: (id: number, data: Partial<Product>) =>
    request<Product>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(normalizeProductPayload(data)),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/products/${id}`, { method: "DELETE" }),
};

export const usersApi = {
  getAll: () => request<User[]>("/users"),
  getOne: (username: string) => request<User>(`/users/${username}`),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ message: string }>("/users/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  resetPassword: (username: string, newPassword: string) =>
    request<{ message: string }>(`/users/reset-password/${username}`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }),
  create: (data: CreateUserPayload) =>
    request<User>("/users", { method: "POST", body: JSON.stringify(data) }),
  update: (username: string, data: UpdateUserPayload) =>
    request<User>(`/users/${username}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (username: string) =>
    request<{ message: string }>(`/users/${username}`, { method: "DELETE" }),
};

export const uploadsApi = {
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    return request<UploadAvatarResponse>("/uploads/avatar", {
      method: "POST",
      body: formData,
    });
  },
  deleteAvatar: (avatarUrl: string) =>
    request<{ message: string }>("/uploads/avatar", {
      method: "DELETE",
      body: JSON.stringify({ avatarUrl }),
    }),
};

export const rolesApi = {
  getAll: () => request<Role[]>("/roles"),
  getOne: (id_role: string) => request<Role>(`/roles/${id_role}`),
  create: (data: CreateRolePayload) =>
    request<Role>("/roles", { method: "POST", body: JSON.stringify(data) }),
  update: (id_role: string, data: UpdateRolePayload) =>
    request<Role>(`/roles/${id_role}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id_role: string) =>
    request<{ message: string }>(`/roles/${id_role}`, { method: "DELETE" }),
};

export const rightsApi = {
  getAll: () => request<Right[]>("/rights"),
  getOne: (id_right: string) => request<Right>(`/rights/${id_right}`),
  create: (data: CreateRightPayload) =>
    request<Right>("/rights", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id_right: string, data: UpdateRightPayload) =>
    request<Right>(`/rights/${id_right}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id_right: string) =>
    request<{ message: string }>(`/rights/${id_right}`, { method: "DELETE" }),
};

export interface HistoryCreatePayload {
  user_name: string;
  action: string;
  entity: string;
  entity_id?: string | number | null;
  details: string;
}

export const historyApi = {
  getAll: () => request<HistoryEntry[]>("/history"),
  create: (data: HistoryCreatePayload) =>
    request<HistoryEntry>("/history", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const executionModeApi = {
  getAll: () => request<ExecutionMode[]>("/execution-mode"),
  getOne: (id: number) => request<ExecutionMode>(`/execution-mode/${id}`),
  create: (data: Partial<ExecutionMode>) =>
    request<ExecutionMode>("/execution-mode", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ExecutionMode>) =>
    request<ExecutionMode>(`/execution-mode/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/execution-mode/${id}`, { method: "DELETE" }),
};

export const stepConfigApi = {
  getAll: () => request<StepConfig[]>("/step"),
  getOne: (id: number) => request<StepConfig>(`/step/${id}`),
  create: (data: Partial<StepConfig>) =>
    request<StepConfig>("/step", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<StepConfig>) =>
    request<StepConfig>(`/step/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/step/${id}`, { method: "DELETE" }),
};

export const stepParamApi = {
  getAll: () => request<StepParam[]>("/step-param"),
  getOne: (id: number) => request<StepParam>(`/step-param/${id}`),
  create: (data: Partial<StepParam>) =>
    request<StepParam>("/step-param", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<StepParam>) =>
    request<StepParam>(`/step-param/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/step-param/${id}`, { method: "DELETE" }),
};

export const stepLimitApi = {
  getAll: () => request<StepLimit[]>("/step-limit"),
  getOne: (id: number) => request<StepLimit>(`/step-limit/${id}`),
  create: (data: Partial<StepLimit>) =>
    request<StepLimit>("/step-limit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<StepLimit>) =>
    request<StepLimit>(`/step-limit/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/step-limit/${id}`, { method: "DELETE" }),
};

export const sequenceConfigApi = {
  getAll: () => request<SequenceConfig[]>("/sequence"),
  getOne: (id: number) => request<SequenceConfig>(`/sequence/${id}`),
  create: (data: Partial<SequenceConfig>) =>
    request<SequenceConfig>("/sequence", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<SequenceConfig>) =>
    request<SequenceConfig>(`/sequence/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/sequence/${id}`, { method: "DELETE" }),
};

export const sequenceStepApi = {
  getAll: () => request<SequenceStep[]>("/sequence-step"),
  getOne: (id: number) => request<SequenceStep>(`/sequence-step/${id}`),
  create: (data: Partial<SequenceStep>) =>
    request<SequenceStep>("/sequence-step", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<SequenceStep>) =>
    request<SequenceStep>(`/sequence-step/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/sequence-step/${id}`, { method: "DELETE" }),
};

export const productSequenceApi = {
  getAll: () => request<ProductSequence[]>("/product-sequence"),
  getOne: (id: number) => request<ProductSequence>(`/product-sequence/${id}`),
  create: (data: Partial<ProductSequence>) =>
    request<ProductSequence>("/product-sequence", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ProductSequence>) =>
    request<ProductSequence>(`/product-sequence/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/product-sequence/${id}`, {
      method: "DELETE",
    }),
};

export const productStepParamApi = {
  getAll: () => request<ProductStepParam[]>("/product-step-param"),
  getOne: (id: number) =>
    request<ProductStepParam>(`/product-step-param/${id}`),
  create: (data: Partial<ProductStepParam>) =>
    request<ProductStepParam>("/product-step-param", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ProductStepParam>) =>
    request<ProductStepParam>(`/product-step-param/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/product-step-param/${id}`, {
      method: "DELETE",
    }),
};

export const componentInstanceApi = {
  getAll: () => request<ComponentInstance[]>("/component-instance"),
  getOne: (id: number) => request<ComponentInstance>(`/component-instance/${id}`),
  create: (data: Partial<ComponentInstance>) =>
    request<ComponentInstance>("/component-instance", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ComponentInstance>) =>
    request<ComponentInstance>(`/component-instance/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/component-instance/${id}`, {
      method: "DELETE",
    }),
};

export const productStepLimitApi = {
  getAll: () => request<ProductStepLimit[]>("/product-step-limit"),
  getOne: (id: number) => request<ProductStepLimit>(`/product-step-limit/${id}`),
  create: (data: Partial<ProductStepLimit>) =>
    request<ProductStepLimit>("/product-step-limit", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ProductStepLimit>) =>
    request<ProductStepLimit>(`/product-step-limit/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/product-step-limit/${id}`, {
      method: "DELETE",
    }),
};

export const productExecutionConfigApi = {
  getAll: () => request<ProductExecutionConfig[]>("/product-execution-config"),
  getOne: (id: number) =>
    request<ProductExecutionConfig>(`/product-execution-config/${id}`),
  create: (data: Partial<ProductExecutionConfig>) =>
    request<ProductExecutionConfig>("/product-execution-config", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ProductExecutionConfig>) =>
    request<ProductExecutionConfig>(`/product-execution-config/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/product-execution-config/${id}`, {
      method: "DELETE",
    }),
};
