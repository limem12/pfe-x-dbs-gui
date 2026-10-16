import { toast } from "sonner";
import { create } from "zustand";
import { hasRight, isAdminRole } from "./access";
import {
  buildApiUrl,
  componentInstanceApi,
  executionModeApi,
  getAuthToken,
  historyApi,
  productExecutionConfigApi,
  productSequenceApi,
  productStepLimitApi,
  productStepParamApi,
  productsApi,
  rightsApi,
  rolesApi,
  sequenceConfigApi,
  sequenceStepApi,
  sequencesApi,
  setAuthToken,
  stepConfigApi,
  stepLimitApi,
  stepParamApi,
  stepsApi,
  usersApi,
  type ComponentInstance,
  type CreateRolePayload,
  type CreateRightPayload,
  type CreateUserPayload,
  type ExecutionMode,
  type HistoryEntry,
  type Product,
  type ProductExecutionConfig,
  type ProductSequence,
  type ProductStepLimit,
  type ProductStepParam,
  type Right,
  type Role,
  type Sequence,
  type SequenceConfig,
  type SequenceStep,
  type Step,
  type StepConfig,
  type StepLimit,
  type StepParam,
  type UpdateRolePayload,
  type UpdateRightPayload,
  type UpdateUserPayload,
  type User,
} from "./api";

function normalizeError(error: unknown, fallback: string): Error {
  if (error instanceof Error && error.message.trim()) {
    return error;
  }

  return new Error(fallback);
}

function showErrorToast(error: unknown, defaultMessage: string) {
  const message = normalizeError(error, defaultMessage).message;

  toast.error(defaultMessage, {
    description: message !== defaultMessage ? message : undefined,
    duration: 4000,
  });
}

function showSuccessToast(message: string, description?: string) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

function withAuditUser<T extends object>(
  payload: T,
  username?: string | null,
): T & { auditUser?: string } {
  const auditUser = username?.trim();

  return auditUser ? { ...payload, auditUser } : payload;
}

async function reloadHistoryAfterAudit(reloadHistory: () => Promise<void>) {
  await reloadHistory();

  setTimeout(() => {
    void reloadHistory();
  }, 350);
}

function sortRights(rights: Right[]): Right[] {
  return [...rights].sort((left, right) => {
    if (left.module && !right.module) {
      return -1;
    }

    if (!left.module && right.module) {
      return 1;
    }

    const moduleComparison = (left.module || "").localeCompare(right.module || "");

    if (moduleComparison !== 0) {
      return moduleComparison;
    }

    return left.id_right.localeCompare(right.id_right);
  });
}

function isExpectedLoginFailureMessage(message: string): boolean {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("incorrect") ||
    normalizedMessage.includes("desactive") ||
    normalizedMessage.includes("désactivé") ||
    normalizedMessage.includes("inactif") ||
    normalizedMessage.includes("inactive") ||
    normalizedMessage.includes("disabled") ||
    normalizedMessage.includes("unauthorized")
  );
}

function canLoadUsers(currentUser: User | null): boolean {
  return hasRight(currentUser, "MANAGE_USERS");
}

function syncCurrentUser(
  currentUser: User | null,
  updatedUser: User,
  previousUsername?: string,
): User | null {
  if (!currentUser) {
    return currentUser;
  }

  const candidates = [previousUsername, currentUser.username]
    .filter(Boolean)
    .map((value) => value!.toLowerCase());

  if (candidates.includes(updatedUser.username.toLowerCase())) {
    return updatedUser;
  }

  return currentUser;
}

async function refreshSafely(label: string, refresh: () => Promise<void>) {
  try {
    await refresh();
  } catch (error) {
    console.error(`Erreur refresh ${label}:`, error);
  }
}

type AuthTokenPayload = {
  sub?: string;
  username?: string;
  role?: string;
  rights?: string[];
  exp?: number;
};

function decodeJwtPayload(token: string): AuthTokenPayload {
  const [, payloadPart] = token.split(".");

  if (!payloadPart) {
    throw new Error("Token JWT invalide");
  }

  const normalizedBase64 = payloadPart
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(payloadPart.length / 4) * 4, "=");

  return JSON.parse(atob(normalizedBase64)) as AuthTokenPayload;
}

interface AppState {
  steps: Step[];
  sequences: Sequence[];
  products: Product[];
  users: User[];
  roles: Role[];
  rights: Right[];
  history: HistoryEntry[];
  executionModes: ExecutionMode[];
  stepConfigs: StepConfig[];
  stepParams: StepParam[];
  stepLimits: StepLimit[];
  sequencesConfig: SequenceConfig[];
  sequenceSteps: SequenceStep[];
  productSequences: ProductSequence[];
  productStepParams: ProductStepParam[];
  componentInstances: ComponentInstance[];
  productStepLimits: ProductStepLimit[];
  executionConfigs: ProductExecutionConfig[];
  currentUser: User | null;
  hasHydratedAuth: boolean;
  isLoading: boolean;
  isDeleting: boolean;
  loadFromStorage: () => Promise<void>;
  loadAll: () => Promise<void>;
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  reloadHistory: () => Promise<void>;
  addStep: (step: Omit<Step, "id" | "createdAt" | "createdBy">) => Promise<Step>;
  updateStep: (id: number, step: Partial<Step>) => Promise<void>;
  deleteStep: (id: number) => Promise<void>;
  addSequence: (
    seq: Omit<Sequence, "id" | "createdAt" | "createdBy">,
  ) => Promise<void>;
  updateSequence: (id: number, seq: Partial<Sequence>) => Promise<void>;
  deleteSequence: (id: number) => Promise<void>;
  addProduct: (
    prod: Omit<Product, "id" | "createdAt" | "createdBy">,
  ) => Promise<void>;
  updateProduct: (id: number, prod: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  addUser: (user: CreateUserPayload) => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<void>;
  resetUserPassword: (username: string, newPassword: string) => Promise<void>;
  updateUser: (username: string, user: UpdateUserPayload) => Promise<void>;
  deleteUser: (username: string) => Promise<void>;
  addRole: (role: CreateRolePayload) => Promise<void>;
  updateRole: (id_role: string, role: UpdateRolePayload) => Promise<void>;
  deleteRole: (id_role: string) => Promise<void>;
  addRight: (right: CreateRightPayload) => Promise<void>;
  updateRight: (id_right: string, right: UpdateRightPayload) => Promise<void>;
  deleteRight: (id_right: string) => Promise<void>;
  loadExecutionModes: () => Promise<void>;
  loadStepConfigs: () => Promise<void>;
  loadStepParams: () => Promise<void>;
  loadStepLimits: () => Promise<void>;
  loadSequencesConfig: () => Promise<void>;
  loadSequenceSteps: () => Promise<void>;
  loadProductSequences: () => Promise<void>;
  loadProductStepParams: () => Promise<void>;
  loadComponentInstances: () => Promise<void>;
  loadProductStepLimits: () => Promise<void>;
  loadExecutionConfigs: () => Promise<void>;
  addExecutionMode: (mode: Partial<ExecutionMode>) => Promise<void>;
  updateExecutionMode: (id: number, mode: Partial<ExecutionMode>) => Promise<void>;
  deleteExecutionMode: (id: number) => Promise<void>;
  addStepConfig: (step: Partial<StepConfig>) => Promise<void>;
  updateStepConfig: (id: number, step: Partial<StepConfig>) => Promise<void>;
  deleteStepConfig: (id: number) => Promise<void>;
  addStepParam: (param: Partial<StepParam>) => Promise<void>;
  updateStepParam: (id: number, param: Partial<StepParam>) => Promise<void>;
  deleteStepParam: (id: number) => Promise<void>;
  addStepLimit: (limit: Partial<StepLimit>) => Promise<void>;
  updateStepLimit: (id: number, limit: Partial<StepLimit>) => Promise<void>;
  deleteStepLimit: (id: number) => Promise<void>;
  addSequenceConfig: (sequence: Partial<SequenceConfig>) => Promise<void>;
  updateSequenceConfig: (id: number, sequence: Partial<SequenceConfig>) => Promise<void>;
  deleteSequenceConfig: (id: number) => Promise<void>;
  addSequenceStep: (link: Partial<SequenceStep>) => Promise<void>;
  updateSequenceStep: (id: number, link: Partial<SequenceStep>) => Promise<void>;
  deleteSequenceStep: (id: number) => Promise<void>;
  addProductSequence: (link: Partial<ProductSequence>) => Promise<void>;
  updateProductSequence: (id: number, link: Partial<ProductSequence>) => Promise<void>;
  deleteProductSequence: (id: number) => Promise<void>;
  addProductStepParam: (value: Partial<ProductStepParam>) => Promise<void>;
  updateProductStepParam: (id: number, value: Partial<ProductStepParam>) => Promise<void>;
  deleteProductStepParam: (id: number) => Promise<void>;
  addComponentInstance: (value: Partial<ComponentInstance>) => Promise<ComponentInstance>;
  updateComponentInstance: (id: number, value: Partial<ComponentInstance>) => Promise<void>;
  deleteComponentInstance: (id: number) => Promise<void>;
  addProductStepLimit: (value: Partial<ProductStepLimit>) => Promise<void>;
  updateProductStepLimit: (id: number, value: Partial<ProductStepLimit>) => Promise<void>;
  deleteProductStepLimit: (id: number) => Promise<void>;
  addExecutionConfig: (config: Partial<ProductExecutionConfig>) => Promise<void>;
  updateExecutionConfig: (id: number, config: Partial<ProductExecutionConfig>) => Promise<void>;
  deleteExecutionConfig: (id: number) => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  steps: [],
  sequences: [],
  products: [],
  users: [],
  roles: [],
  rights: [],
  history: [],
  executionModes: [],
  stepConfigs: [],
  stepParams: [],
  stepLimits: [],
  sequencesConfig: [],
  sequenceSteps: [],
  productSequences: [],
  productStepParams: [],
  componentInstances: [],
  productStepLimits: [],
  executionConfigs: [],
  currentUser: null,
  hasHydratedAuth: false,
  isLoading: false,
  isDeleting: false,

  loadFromStorage: async () => {
    const token = getAuthToken();

    if (!token) {
      set({ hasHydratedAuth: true });
      return;
    }

    const isNewSession =
      typeof window !== "undefined" &&
      !sessionStorage.getItem("app_initialized");

    if (isNewSession) {
      setAuthToken(null);
      sessionStorage.setItem("app_initialized", "true");
      set({
        currentUser: null,
        hasHydratedAuth: true,
      });
      return;
    }

    set({ isLoading: true });

    try {
      const payload = decodeJwtPayload(token);
      const username = payload.username || payload.sub;

      if (!username) {
        throw new Error("Token JWT incomplet");
      }

      if (payload.exp && Date.now() >= payload.exp * 1000) {
        setAuthToken(null);
        set({
          currentUser: null,
          isLoading: false,
          hasHydratedAuth: true,
        });
        return;
      }

      const restoredUser: User = {
        username,
        role: payload.role || "USER",
        rights: Array.isArray(payload.rights) ? payload.rights : [],
        status: "ENABLED",
        email: null,
        phone: null,
        address: null,
        avatar: null,
        lastLogin: null,
        createdAt: new Date().toISOString(),
      };

      set({ currentUser: restoredUser });
      await get().loadAll();
      set({ hasHydratedAuth: true });
    } catch (error) {
      console.error("Erreur lors de la restauration de session:", error);
      setAuthToken(null);
      set({
        currentUser: null,
        steps: [],
        sequences: [],
        products: [],
        users: [],
        roles: [],
        rights: [],
        history: [],
        executionModes: [],
        stepConfigs: [],
        stepParams: [],
        stepLimits: [],
        sequencesConfig: [],
        sequenceSteps: [],
        productSequences: [],
        productStepParams: [],
        componentInstances: [],
        productStepLimits: [],
        executionConfigs: [],
        isLoading: false,
        hasHydratedAuth: true,
      });
    }
  },

  reloadHistory: async () => {
    try {
      const history = await historyApi.getAll();
      set({ history });
    } catch (error) {
      console.error("Erreur rechargement historique:", error);
    }
  },

  loadAll: async () => {
    set({ isLoading: true });

    try {
      const currentUser = get().currentUser;
      const includeManagementData = canLoadUsers(currentUser);

      const [
        steps,
        sequences,
        products,
        history,
        roles,
        rights,
        users,
        executionModes,
        stepConfigs,
        stepParams,
        stepLimits,
        sequencesConfig,
        sequenceSteps,
        productSequences,
        productStepParams,
        componentInstances,
        productStepLimits,
        executionConfigs,
      ] =
        await Promise.all([
          stepsApi.getAll(),
          sequencesApi.getAll(),
          productsApi.getAll(),
          historyApi.getAll(),
          includeManagementData ? rolesApi.getAll() : Promise.resolve([]),
          includeManagementData ? rightsApi.getAll() : Promise.resolve([]),
          includeManagementData ? usersApi.getAll() : Promise.resolve([]),
          includeManagementData ? executionModeApi.getAll() : Promise.resolve([]),
          includeManagementData ? stepConfigApi.getAll() : Promise.resolve([]),
          includeManagementData ? stepParamApi.getAll() : Promise.resolve([]),
          includeManagementData ? stepLimitApi.getAll() : Promise.resolve([]),
          includeManagementData ? sequenceConfigApi.getAll() : Promise.resolve([]),
          includeManagementData ? sequenceStepApi.getAll() : Promise.resolve([]),
          includeManagementData ? productSequenceApi.getAll() : Promise.resolve([]),
          includeManagementData ? productStepParamApi.getAll() : Promise.resolve([]),
          includeManagementData ? componentInstanceApi.getAll() : Promise.resolve([]),
          includeManagementData ? productStepLimitApi.getAll() : Promise.resolve([]),
          includeManagementData
            ? productExecutionConfigApi.getAll()
            : Promise.resolve([]),
        ]);

      set({
        steps,
        sequences,
        products,
        history,
        roles,
        rights: sortRights(rights),
        users,
        executionModes,
        stepConfigs,
        stepParams,
        stepLimits,
        sequencesConfig,
        sequenceSteps,
        productSequences,
        productStepParams,
        componentInstances,
        productStepLimits,
        executionConfigs,
        currentUser:
          users.find(
            (user) =>
              user.username.toLowerCase() === currentUser?.username.toLowerCase(),
          ) ?? currentUser,
        isLoading: false,
      });
    } catch (error) {
      console.error("Erreur chargement donnees:", error);
      showErrorToast(error, "Erreur de chargement des donnees");

      if (!getAuthToken()) {
        set({
          currentUser: null,
          steps: [],
          sequences: [],
          products: [],
          users: [],
          roles: [],
          rights: [],
          history: [],
          executionModes: [],
          stepConfigs: [],
          stepParams: [],
          stepLimits: [],
          sequencesConfig: [],
          sequenceSteps: [],
          productSequences: [],
          productStepParams: [],
          componentInstances: [],
          productStepLimits: [],
          executionConfigs: [],
          isLoading: false,
        });
        return;
      }

      set({ isLoading: false });
    }
  },

  login: async (username: string, password: string) => {
    try {
      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        let message = "Nom ou mot de passe incorrect";

        try {
          const payload = (await response.json()) as { message?: string };
          message = payload.message || message;
        } catch {
          message = "Nom ou mot de passe incorrect";
        }

        throw new Error(message);
      }

      const data = (await response.json()) as {
        access_token: string;
        user: User;
      };

      setAuthToken(data.access_token);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("app_initialized", "true");
      }

      set({ currentUser: data.user, hasHydratedAuth: true });
      await get().loadAll();
      return data.user;
    } catch (error) {
      if (
        error instanceof TypeError ||
        (error instanceof Error &&
          /fetch|network/i.test(error.message))
      ) {
        throw new Error("Impossible de joindre le serveur");
      }

      const normalizedError = normalizeError(error, "Erreur de connexion");

      if (!isExpectedLoginFailureMessage(normalizedError.message)) {
        console.warn("Login warning:", normalizedError);
      }

      throw normalizedError;
    }
  },

  logout: () => {
    setAuthToken(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("app_initialized");
    }

    set({
      currentUser: null,
      steps: [],
      sequences: [],
      products: [],
      users: [],
      roles: [],
      rights: [],
      history: [],
      executionModes: [],
      stepConfigs: [],
      stepParams: [],
      stepLimits: [],
      sequencesConfig: [],
      sequenceSteps: [],
      productSequences: [],
      productStepParams: [],
      componentInstances: [],
      productStepLimits: [],
      executionConfigs: [],
      hasHydratedAuth: true,
    });
    showSuccessToast("Deconnexion reussie", "Vous avez ete deconnecte.");
  },

  addStep: async (step) => {
    try {
      const newStep = await stepsApi.create(
        withAuditUser(step, get().currentUser?.username),
      );
      set((state) => ({ steps: [...state.steps, newStep] }));
      await refreshSafely("steps", async () => {
        const [steps, stepConfigs, executionConfigs] = await Promise.all([
          stepsApi.getAll(),
          stepConfigApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ steps, stepConfigs, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast("Step cree", `Le step "${newStep.name}" a ete ajoute.`);
      return newStep;
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation du step");
      throw normalizeError(error, "Erreur lors de la creation du step");
    }
  },

  updateStep: async (id, step) => {
    try {
      const updated = await stepsApi.update(
        id,
        withAuditUser(step, get().currentUser?.username),
      );
      set((state) => ({
        steps: state.steps.map((item) => (item.id === id ? updated : item)),
      }));
      await refreshSafely("steps", async () => {
        const [steps, stepConfigs, executionConfigs] = await Promise.all([
          stepsApi.getAll(),
          stepConfigApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ steps, stepConfigs, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Step modifie",
        `Le step "${updated.name}" a ete mis a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification du step");
      throw normalizeError(error, "Erreur lors de la modification du step");
    }
  },

  deleteStep: async (id) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });
    const step = get().steps.find((item) => item.id === id);
    const stepName = step?.name || `Step ${id}`;

    try {
      await stepsApi.delete(id);

      const [steps, sequences, products] = await Promise.all([
        stepsApi.getAll(),
        sequencesApi.getAll(),
        productsApi.getAll(),
      ]);

      await get().reloadHistory();
      set({ steps, sequences, products, isDeleting: false });
      showSuccessToast(
        "Step supprime",
        `Le step "${stepName}" a ete supprime.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression du step",
      );
      console.error(error);
      showErrorToast(normalizedError, "Erreur lors de la suppression du step");

      try {
        const [steps, sequences, products] = await Promise.all([
          stepsApi.getAll(),
          sequencesApi.getAll(),
          productsApi.getAll(),
        ]);
        set({ steps, sequences, products, isDeleting: false });
      } catch {
        set({ isDeleting: false });
      }

      throw normalizedError;
    }
  },

  addSequence: async (seq) => {
    try {
      const newSequence = await sequencesApi.create(seq);
      set((state) => ({ sequences: [...state.sequences, newSequence] }));
      await refreshSafely("sequences", async () => {
        const [sequences, sequencesConfig, sequenceSteps, executionConfigs] =
          await Promise.all([
            sequencesApi.getAll(),
            sequenceConfigApi.getAll(),
            sequenceStepApi.getAll(),
            productExecutionConfigApi.getAll(),
          ]);
        set({ sequences, sequencesConfig, sequenceSteps, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Sequence creee",
        `La sequence "${newSequence.name}" a ete ajoutee.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation de la sequence");
      throw normalizeError(error, "Erreur lors de la creation de la sequence");
    }
  },

  updateSequence: async (id, seq) => {
    try {
      const updated = await sequencesApi.update(id, seq);
      set((state) => ({
        sequences: state.sequences.map((item) =>
          item.id === id ? updated : item,
        ),
      }));
      await refreshSafely("sequences", async () => {
        const [sequences, sequencesConfig, sequenceSteps, executionConfigs] =
          await Promise.all([
            sequencesApi.getAll(),
            sequenceConfigApi.getAll(),
            sequenceStepApi.getAll(),
            productExecutionConfigApi.getAll(),
          ]);
        set({ sequences, sequencesConfig, sequenceSteps, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Sequence modifiee",
        `La sequence "${updated.name}" a ete mise a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification de la sequence");
      throw normalizeError(
        error,
        "Erreur lors de la modification de la sequence",
      );
    }
  },

  deleteSequence: async (id) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });
    const sequence = get().sequences.find((item) => item.id === id);
    const sequenceName = sequence?.name || `Sequence ${id}`;

    try {
      await sequencesApi.delete(id);

      const [sequences, products] = await Promise.all([
        sequencesApi.getAll(),
        productsApi.getAll(),
      ]);

      await get().reloadHistory();
      set({ sequences, products, isDeleting: false });
      showSuccessToast(
        "Sequence supprimee",
        `La sequence "${sequenceName}" a ete supprimee.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression de la sequence",
      );
      console.error(error);
      showErrorToast(
        normalizedError,
        "Erreur lors de la suppression de la sequence",
      );

      try {
        const [sequences, products] = await Promise.all([
          sequencesApi.getAll(),
          productsApi.getAll(),
        ]);
        set({ sequences, products, isDeleting: false });
      } catch {
        set({ isDeleting: false });
      }

      throw normalizedError;
    }
  },

  addProduct: async (prod) => {
    try {
      const newProduct = await productsApi.create(prod);
      set((state) => ({ products: [...state.products, newProduct] }));
      await refreshSafely("produits", async () => {
        const [products, productSequences, executionConfigs] = await Promise.all([
          productsApi.getAll(),
          productSequenceApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ products, productSequences, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Produit cree",
        `Le produit "${newProduct.name}" a ete ajoute.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation du produit");
      throw normalizeError(error, "Erreur lors de la creation du produit");
    }
  },

  updateProduct: async (id, prod) => {
    try {
      const updated = await productsApi.update(id, prod);
      set((state) => ({
        products: state.products.map((item) => (item.id === id ? updated : item)),
      }));
      await refreshSafely("produits", async () => {
        const [products, productSequences, executionConfigs] = await Promise.all([
          productsApi.getAll(),
          productSequenceApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ products, productSequences, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Produit modifie",
        `Le produit "${updated.name}" a ete mis a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification du produit");
      throw normalizeError(error, "Erreur lors de la modification du produit");
    }
  },

  deleteProduct: async (id) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });
    const product = get().products.find((item) => item.id === id);
    const productName = product?.name || `Produit ${id}`;

    try {
      await productsApi.delete(id);
      await get().reloadHistory();
      set((state) => ({
        products: state.products.filter((item) => item.id !== id),
        isDeleting: false,
      }));
      await refreshSafely("produits", async () => {
        const [products, productSequences, executionConfigs] = await Promise.all([
          productsApi.getAll(),
          productSequenceApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ products, productSequences, executionConfigs, isDeleting: false });
      });
      showSuccessToast(
        "Produit supprime",
        `Le produit "${productName}" a ete supprime.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression du produit",
      );
      console.error(error);
      showErrorToast(normalizedError, "Erreur lors de la suppression du produit");
      set({ isDeleting: false });
      throw normalizedError;
    }
  },

  addUser: async (user) => {
    try {
      const newUser = await usersApi.create(user);
      set((state) => ({ users: [...state.users, newUser] }));
      await refreshSafely("utilisateurs", async () => {
        const users = await usersApi.getAll();
        const currentUser = get().currentUser;
        set({
          users,
          currentUser:
            users.find(
              (item) =>
                item.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
        });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Utilisateur cree",
        `Le compte "${newUser.username}" a ete ajoute.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation de l'utilisateur");
      throw normalizeError(
        error,
        "Erreur lors de la creation de l'utilisateur",
      );
    }
  },

  changePassword: async (currentPassword, newPassword) => {
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      await get().reloadHistory();
      showSuccessToast(
        "Mot de passe modifie",
        "Votre mot de passe a bien ete mis a jour.",
      );
    } catch (error) {
      console.error("Erreur changement mot de passe:", error);
      throw normalizeError(error, "Erreur lors du changement de mot de passe");
    }
  },

  resetUserPassword: async (username, newPassword) => {
    try {
      await usersApi.resetPassword(username, newPassword);
      await get().reloadHistory();
      showSuccessToast(
        "Mot de passe reinitialise",
        `Le mot de passe de "${username}" a ete reinitialise.`,
      );
    } catch (error) {
      console.error(error);
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la reinitialisation",
      );
      showErrorToast(normalizedError, "Erreur lors de la reinitialisation");
      throw normalizedError;
    }
  },

  updateUser: async (username, user) => {
    try {
      const updated = await usersApi.update(username, user);
      set((state) => ({
        users: state.users.map((item) =>
          item.username.toLowerCase() === username.toLowerCase() ? updated : item,
        ),
        currentUser: syncCurrentUser(state.currentUser, updated, username),
      }));
      await refreshSafely("utilisateurs", async () => {
        const users = await usersApi.getAll();
        const currentUser = get().currentUser;
        set({
          users,
          currentUser:
            users.find(
              (item) =>
                item.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
        });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Utilisateur modifie",
        `Le compte "${updated.username}" a ete mis a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification de l'utilisateur");
      throw normalizeError(
        error,
        "Erreur lors de la modification de l'utilisateur",
      );
    }
  },

  deleteUser: async (username) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });
    const user = get().users.find(
      (item) => item.username.toLowerCase() === username.toLowerCase(),
    );
    const displayName = user?.username || username;

    try {
      await usersApi.delete(username);
      await get().reloadHistory();
      set((state) => ({
        users: state.users.filter(
          (item) => item.username.toLowerCase() !== username.toLowerCase(),
        ),
        isDeleting: false,
      }));
      await refreshSafely("utilisateurs", async () => {
        const users = await usersApi.getAll();
        const currentUser = get().currentUser;
        set({
          users,
          currentUser:
            users.find(
              (item) =>
                item.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
          isDeleting: false,
        });
      });
      showSuccessToast(
        "Utilisateur supprime",
        `Le compte "${displayName}" a ete supprime.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression de l'utilisateur",
      );
      console.error(error);
      showErrorToast(
        normalizedError,
        "Erreur lors de la suppression de l'utilisateur",
      );
      set({ isDeleting: false });
      throw normalizedError;
    }
  },

  addRole: async (role) => {
    try {
      const newRole = await rolesApi.create(role);
      set((state) => ({ roles: [...state.roles, newRole] }));
      await refreshSafely("roles", async () => {
        const [roles, users] = await Promise.all([
          rolesApi.getAll(),
          usersApi.getAll(),
        ]);
        const currentUser = get().currentUser;
        set({
          roles,
          users,
          currentUser:
            users.find(
              (user) =>
                user.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
        });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Role cree",
        `Le role "${newRole.id_role}" a ete ajoute.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation du role");
      throw normalizeError(error, "Erreur lors de la creation du role");
    }
  },

  updateRole: async (id_role, role) => {
    try {
      const updated = await rolesApi.update(id_role, role);
      set((state) => ({
        roles: state.roles.map((item) =>
          item.id_role === id_role ? updated : item,
        ),
      }));

      const currentUser = get().currentUser;
      if (
        currentUser &&
        currentUser.role.toLowerCase() === id_role.toLowerCase() &&
        !isAdminRole(currentUser.role)
      ) {
        set({
          currentUser: {
            ...currentUser,
            rights: updated.rights,
          },
        });
      }

      await refreshSafely("roles", async () => {
        const [roles, users] = await Promise.all([
          rolesApi.getAll(),
          usersApi.getAll(),
        ]);
        const refreshedCurrentUser = get().currentUser;
        set({
          roles,
          users,
          currentUser:
            users.find(
              (user) =>
                user.username.toLowerCase() ===
                refreshedCurrentUser?.username.toLowerCase(),
            ) ?? refreshedCurrentUser,
        });
      });
      await get().reloadHistory();
      showSuccessToast(
        "Role modifie",
        `Le role "${updated.id_role}" a ete mis a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification du role");
      throw normalizeError(error, "Erreur lors de la modification du role");
    }
  },

  deleteRole: async (id_role) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });

    try {
      await rolesApi.delete(id_role);
      await get().reloadHistory();
      set((state) => ({
        roles: state.roles.filter((item) => item.id_role !== id_role),
        isDeleting: false,
      }));
      await refreshSafely("roles", async () => {
        const [roles, users] = await Promise.all([
          rolesApi.getAll(),
          usersApi.getAll(),
        ]);
        const currentUser = get().currentUser;
        set({
          roles,
          users,
          currentUser:
            users.find(
              (user) =>
                user.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
          isDeleting: false,
        });
      });
      showSuccessToast(
        "Role supprime",
        `Le role "${id_role}" a ete supprime.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression du role",
      );
      console.error(error);
      showErrorToast(normalizedError, "Erreur lors de la suppression du role");
      set({ isDeleting: false });
      throw normalizedError;
    }
  },

  addRight: async (right) => {
    try {
      const newRight = await rightsApi.create(right);
      set((state) => ({
        rights: sortRights([...state.rights, newRight]),
      }));
      await refreshSafely("droits", async () => {
        const rights = await rightsApi.getAll();
        set({ rights: sortRights(rights) });
      });
      showSuccessToast(
        "Droit cree",
        `Le droit "${newRight.id_right}" a ete ajoute.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la creation du droit");
      throw normalizeError(error, "Erreur lors de la creation du droit");
    }
  },

  updateRight: async (id_right, right) => {
    try {
      const updated = await rightsApi.update(id_right, right);
      set((state) => ({
        rights: sortRights(
          state.rights.map((item) =>
            item.id_right === id_right ? updated : item,
          ),
        ),
      }));
      await refreshSafely("droits", async () => {
        const [rights, roles, users] = await Promise.all([
          rightsApi.getAll(),
          rolesApi.getAll(),
          usersApi.getAll(),
        ]);
        const currentUser = get().currentUser;
        set({
          rights: sortRights(rights),
          roles,
          users,
          currentUser:
            users.find(
              (user) =>
                user.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
        });
      });
      showSuccessToast(
        "Droit modifie",
        `Le droit "${updated.id_right}" a ete mis a jour.`,
      );
    } catch (error) {
      console.error(error);
      showErrorToast(error, "Erreur lors de la modification du droit");
      throw normalizeError(error, "Erreur lors de la modification du droit");
    }
  },

  deleteRight: async (id_right) => {
    if (get().isDeleting) {
      return;
    }

    set({ isDeleting: true });

    try {
      await rightsApi.delete(id_right);
      set((state) => ({
        rights: state.rights.filter((item) => item.id_right !== id_right),
        users: state.users.map((user) => ({
          ...user,
          rights: (user.rights || []).filter((right) => right !== id_right),
        })),
        currentUser: state.currentUser
          ? {
              ...state.currentUser,
              rights: (state.currentUser.rights || []).filter(
                (right) => right !== id_right,
              ),
            }
          : null,
        isDeleting: false,
      }));
      await refreshSafely("droits", async () => {
        const [rights, roles, users] = await Promise.all([
          rightsApi.getAll(),
          rolesApi.getAll(),
          usersApi.getAll(),
        ]);
        const currentUser = get().currentUser;
        set({
          rights: sortRights(rights),
          roles,
          users,
          currentUser:
            users.find(
              (user) =>
                user.username.toLowerCase() === currentUser?.username.toLowerCase(),
            ) ?? currentUser,
          isDeleting: false,
        });
      });
      showSuccessToast(
        "Droit supprime",
        `Le droit "${id_right}" a ete supprime.`,
      );
    } catch (error) {
      const normalizedError = normalizeError(
        error,
        "Erreur lors de la suppression du droit",
      );
      console.error(error);
      showErrorToast(normalizedError, "Erreur lors de la suppression du droit");
      set({ isDeleting: false });
      throw normalizedError;
    }
  },

  loadExecutionModes: async () => {
    set({ executionModes: await executionModeApi.getAll() });
  },

  loadStepConfigs: async () => {
    set({ stepConfigs: await stepConfigApi.getAll() });
  },

  loadStepParams: async () => {
    set({ stepParams: await stepParamApi.getAll() });
  },

  loadStepLimits: async () => {
    set({ stepLimits: await stepLimitApi.getAll() });
  },

  loadSequencesConfig: async () => {
    set({ sequencesConfig: await sequenceConfigApi.getAll() });
  },

  loadSequenceSteps: async () => {
    set({ sequenceSteps: await sequenceStepApi.getAll() });
  },

  loadProductSequences: async () => {
    set({ productSequences: await productSequenceApi.getAll() });
  },

  loadProductStepParams: async () => {
    set({ productStepParams: await productStepParamApi.getAll() });
  },

  loadComponentInstances: async () => {
    set({ componentInstances: await componentInstanceApi.getAll() });
  },

  loadProductStepLimits: async () => {
    set({ productStepLimits: await productStepLimitApi.getAll() });
  },

  loadExecutionConfigs: async () => {
    set({ executionConfigs: await productExecutionConfigApi.getAll() });
  },

  addExecutionMode: async (mode) => {
    try {
      const created = await executionModeApi.create(mode);
      set((state) => ({ executionModes: [...state.executionModes, created] }));
      await refreshSafely("modes execution", async () => {
        const [executionModes, executionConfigs] = await Promise.all([
          executionModeApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ executionModes, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast("Mode cree", `Le mode "${created.name}" a ete ajoute.`);
    } catch (error) {
      showErrorToast(error, "Erreur lors de la creation du mode");
      throw normalizeError(error, "Erreur lors de la creation du mode");
    }
  },

  updateExecutionMode: async (id, mode) => {
    try {
      const updated = await executionModeApi.update(id, mode);
      set((state) => ({
        executionModes: state.executionModes.map((item) =>
          item.id === id ? updated : item,
        ),
      }));
      await refreshSafely("modes execution", async () => {
        const [executionModes, executionConfigs] = await Promise.all([
          executionModeApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ executionModes, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast("Mode modifie", `Le mode "${updated.name}" a ete mis a jour.`);
    } catch (error) {
      showErrorToast(error, "Erreur lors de la modification du mode");
      throw normalizeError(error, "Erreur lors de la modification du mode");
    }
  },

  deleteExecutionMode: async (id) => {
    try {
      await executionModeApi.delete(id);
      set((state) => ({
        executionModes: state.executionModes.filter((item) => item.id !== id),
        executionConfigs: state.executionConfigs.filter(
          (item) => item.execution_mode_id !== id,
        ),
      }));
      await refreshSafely("modes execution", async () => {
        const [executionModes, executionConfigs] = await Promise.all([
          executionModeApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
        set({ executionModes, executionConfigs });
      });
      await get().reloadHistory();
      showSuccessToast("Mode supprime");
    } catch (error) {
      showErrorToast(error, "Erreur lors de la suppression du mode");
      throw normalizeError(error, "Erreur lors de la suppression du mode");
    }
  },

  addStepConfig: async (step) => {
    const created = await stepConfigApi.create(step);
    set((state) => ({ stepConfigs: [...state.stepConfigs, created] }));
    await refreshSafely("steps config", async () => {
      const [steps, stepConfigs, executionConfigs] = await Promise.all([
        stepsApi.getAll(),
        stepConfigApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ steps, stepConfigs, executionConfigs });
    });
    showSuccessToast("Step cree");
  },

  updateStepConfig: async (id, step) => {
    const updated = await stepConfigApi.update(id, step);
    set((state) => ({
      stepConfigs: state.stepConfigs.map((item) => (item.id === id ? updated : item)),
    }));
    await refreshSafely("steps config", async () => {
      const [steps, stepConfigs, executionConfigs] = await Promise.all([
        stepsApi.getAll(),
        stepConfigApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ steps, stepConfigs, executionConfigs });
    });
    showSuccessToast("Step modifie");
  },

  deleteStepConfig: async (id) => {
    await stepConfigApi.delete(id);
    set((state) => ({
      stepConfigs: state.stepConfigs.filter((item) => item.id !== id),
      stepParams: state.stepParams.filter((item) => item.step_id !== id),
      stepLimits: state.stepLimits.filter((item) => item.step_id !== id),
      sequenceSteps: state.sequenceSteps.filter((item) => item.step_id !== id),
      executionConfigs: state.executionConfigs.filter((item) => item.step_id !== id),
    }));
    await refreshSafely("steps config", async () => {
      const [
        steps,
        stepConfigs,
        stepParams,
        stepLimits,
        sequenceSteps,
        executionConfigs,
      ] = await Promise.all([
        stepsApi.getAll(),
        stepConfigApi.getAll(),
        stepParamApi.getAll(),
        stepLimitApi.getAll(),
        sequenceStepApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ steps, stepConfigs, stepParams, stepLimits, sequenceSteps, executionConfigs });
    });
    showSuccessToast("Step supprime");
  },

  addStepParam: async (param) => {
    try {
      const created = await stepParamApi.create(param);
      set((state) => ({ stepParams: [...state.stepParams, created] }));
      await refreshSafely("parametres step", async () => {
        const [stepParams, steps] = await Promise.all([
          stepParamApi.getAll(),
          stepsApi.getAll(),
        ]);
        set({ stepParams, steps });
      });
      showSuccessToast("Parametre ajoute");
    } catch (error) {
      showErrorToast(error, "Erreur lors de l'ajout du parametre");
      throw normalizeError(error, "Erreur lors de l'ajout du parametre");
    }
  },

  updateStepParam: async (id, param) => {
    try {
      const updated = await stepParamApi.update(id, param);
      set((state) => ({
        stepParams: state.stepParams.map((item) =>
          item.id === id ? updated : item,
        ),
      }));
      await refreshSafely("parametres step", async () => {
        const [stepParams, productStepParams, steps] = await Promise.all([
          stepParamApi.getAll(),
          productStepParamApi.getAll(),
          stepsApi.getAll(),
        ]);
        set({ stepParams, productStepParams, steps });
      });
      showSuccessToast("Parametre modifie");
    } catch (error) {
      showErrorToast(error, "Erreur lors de la modification du parametre");
      throw normalizeError(error, "Erreur lors de la modification du parametre");
    }
  },

  deleteStepParam: async (id) => {
    await stepParamApi.delete(id);
    set((state) => ({
      stepParams: state.stepParams.filter((item) => item.id !== id),
      productStepParams: state.productStepParams.filter(
        (item) => item.step_param_id !== id,
      ),
    }));
    await refreshSafely("parametres step", async () => {
      const [stepParams, productStepParams, steps] = await Promise.all([
        stepParamApi.getAll(),
        productStepParamApi.getAll(),
        stepsApi.getAll(),
      ]);
      set({ stepParams, productStepParams, steps });
    });
    showSuccessToast("Parametre supprime");
  },

  addStepLimit: async (limit) => {
    const created = await stepLimitApi.create(limit);
    set((state) => ({ stepLimits: [...state.stepLimits, created] }));
    await refreshSafely("limites step", async () => {
      const [stepLimits, steps] = await Promise.all([
        stepLimitApi.getAll(),
        stepsApi.getAll(),
      ]);
      set({ stepLimits, steps });
    });
    showSuccessToast("Limite ajoutee");
  },

  updateStepLimit: async (id, limit) => {
    const updated = await stepLimitApi.update(id, limit);
    set((state) => ({
      stepLimits: state.stepLimits.map((item) => (item.id === id ? updated : item)),
    }));
    await refreshSafely("limites step", async () => {
      const [stepLimits, productStepLimits, steps] = await Promise.all([
        stepLimitApi.getAll(),
        productStepLimitApi.getAll(),
        stepsApi.getAll(),
      ]);
      set({ stepLimits, productStepLimits, steps });
    });
    showSuccessToast("Limite modifiee");
  },

  deleteStepLimit: async (id) => {
    await stepLimitApi.delete(id);
    set((state) => ({
      stepLimits: state.stepLimits.filter((item) => item.id !== id),
    }));
    await refreshSafely("limites step", async () => {
      const [stepLimits, productStepLimits, steps] = await Promise.all([
        stepLimitApi.getAll(),
        productStepLimitApi.getAll(),
        stepsApi.getAll(),
      ]);
      set({ stepLimits, productStepLimits, steps });
    });
    showSuccessToast("Limite supprimee");
  },

  addSequenceConfig: async (sequence) => {
    const created = await sequenceConfigApi.create(sequence);
    set((state) => ({ sequencesConfig: [...state.sequencesConfig, created] }));
    await refreshSafely("sequences config", async () => {
      const [sequences, sequencesConfig, sequenceSteps, executionConfigs] =
        await Promise.all([
          sequencesApi.getAll(),
          sequenceConfigApi.getAll(),
          sequenceStepApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
      set({ sequences, sequencesConfig, sequenceSteps, executionConfigs });
    });
    showSuccessToast("Sequence creee");
  },

  updateSequenceConfig: async (id, sequence) => {
    const updated = await sequenceConfigApi.update(id, sequence);
    set((state) => ({
      sequencesConfig: state.sequencesConfig.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("sequences config", async () => {
      const [sequences, sequencesConfig, sequenceSteps, executionConfigs] =
        await Promise.all([
          sequencesApi.getAll(),
          sequenceConfigApi.getAll(),
          sequenceStepApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
      set({ sequences, sequencesConfig, sequenceSteps, executionConfigs });
    });
    showSuccessToast("Sequence modifiee");
  },

  deleteSequenceConfig: async (id) => {
    await sequenceConfigApi.delete(id);
    set((state) => ({
      sequencesConfig: state.sequencesConfig.filter((item) => item.id !== id),
      sequenceSteps: state.sequenceSteps.filter((item) => item.sequence_id !== id),
      productSequences: state.productSequences.filter(
        (item) => item.sequence_id !== id,
      ),
      executionConfigs: state.executionConfigs.filter(
        (item) => item.sequence_id !== id,
      ),
    }));
    await refreshSafely("sequences config", async () => {
      const [
        sequences,
        sequencesConfig,
        sequenceSteps,
        productSequences,
        executionConfigs,
      ] = await Promise.all([
        sequencesApi.getAll(),
        sequenceConfigApi.getAll(),
        sequenceStepApi.getAll(),
        productSequenceApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({
        sequences,
        sequencesConfig,
        sequenceSteps,
        productSequences,
        executionConfigs,
      });
    });
    showSuccessToast("Sequence supprimee");
  },

  addSequenceStep: async (link) => {
    const created = await sequenceStepApi.create(link);
    set((state) => ({ sequenceSteps: [...state.sequenceSteps, created] }));
    await refreshSafely("sequence-step", async () => {
      const [sequenceSteps, sequences, sequencesConfig, executionConfigs] =
        await Promise.all([
          sequenceStepApi.getAll(),
          sequencesApi.getAll(),
          sequenceConfigApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
      set({ sequenceSteps, sequences, sequencesConfig, executionConfigs });
    });
  },

  updateSequenceStep: async (id, link) => {
    const updated = await sequenceStepApi.update(id, link);
    set((state) => ({
      sequenceSteps: state.sequenceSteps.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("sequence-step", async () => {
      const [sequenceSteps, sequences, sequencesConfig, executionConfigs] =
        await Promise.all([
          sequenceStepApi.getAll(),
          sequencesApi.getAll(),
          sequenceConfigApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
      set({ sequenceSteps, sequences, sequencesConfig, executionConfigs });
    });
  },

  deleteSequenceStep: async (id) => {
    await sequenceStepApi.delete(id);
    set((state) => ({
      sequenceSteps: state.sequenceSteps.filter((item) => item.id !== id),
    }));
    await refreshSafely("sequence-step", async () => {
      const [sequenceSteps, sequences, sequencesConfig, executionConfigs] =
        await Promise.all([
          sequenceStepApi.getAll(),
          sequencesApi.getAll(),
          sequenceConfigApi.getAll(),
          productExecutionConfigApi.getAll(),
        ]);
      set({ sequenceSteps, sequences, sequencesConfig, executionConfigs });
    });
  },

  addProductSequence: async (link) => {
    const created = await productSequenceApi.create(link);
    set((state) => ({ productSequences: [...state.productSequences, created] }));
    await refreshSafely("product-sequence", async () => {
      const [products, productSequences, executionConfigs] = await Promise.all([
        productsApi.getAll(),
        productSequenceApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ products, productSequences, executionConfigs });
    });
  },

  updateProductSequence: async (id, link) => {
    const updated = await productSequenceApi.update(id, link);
    set((state) => ({
      productSequences: state.productSequences.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("product-sequence", async () => {
      const [products, productSequences, executionConfigs] = await Promise.all([
        productsApi.getAll(),
        productSequenceApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ products, productSequences, executionConfigs });
    });
  },

  deleteProductSequence: async (id) => {
    await productSequenceApi.delete(id);
    set((state) => ({
      productSequences: state.productSequences.filter((item) => item.id !== id),
    }));
    await refreshSafely("product-sequence", async () => {
      const [products, productSequences, executionConfigs] = await Promise.all([
        productsApi.getAll(),
        productSequenceApi.getAll(),
        productExecutionConfigApi.getAll(),
      ]);
      set({ products, productSequences, executionConfigs });
    });
  },

  addProductStepParam: async (value) => {
    const created = await productStepParamApi.create(value);
    set((state) => ({ productStepParams: [...state.productStepParams, created] }));
    await refreshSafely("valeurs parametres produit", async () => {
      const productStepParams = await productStepParamApi.getAll();
      set({ productStepParams });
    });
  },

  updateProductStepParam: async (id, value) => {
    const updated = await productStepParamApi.update(id, value);
    set((state) => ({
      productStepParams: state.productStepParams.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("valeurs parametres produit", async () => {
      const productStepParams = await productStepParamApi.getAll();
      set({ productStepParams });
    });
  },

  deleteProductStepParam: async (id) => {
    await productStepParamApi.delete(id);
    set((state) => ({
      productStepParams: state.productStepParams.filter((item) => item.id !== id),
    }));
    await refreshSafely("valeurs parametres produit", async () => {
      const productStepParams = await productStepParamApi.getAll();
      set({ productStepParams });
    });
  },

  addComponentInstance: async (value) => {
    const created = await componentInstanceApi.create(value);
    set((state) => ({ componentInstances: [...state.componentInstances, created] }));
    await refreshSafely("instances composant", async () => {
      const [componentInstances, productStepLimits] = await Promise.all([
        componentInstanceApi.getAll(),
        productStepLimitApi.getAll(),
      ]);
      set({ componentInstances, productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Composant ajoute");
    return created;
  },

  updateComponentInstance: async (id, value) => {
    const updated = await componentInstanceApi.update(id, value);
    set((state) => ({
      componentInstances: state.componentInstances.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("instances composant", async () => {
      const [componentInstances, productStepLimits] = await Promise.all([
        componentInstanceApi.getAll(),
        productStepLimitApi.getAll(),
      ]);
      set({ componentInstances, productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Composant modifie");
  },

  deleteComponentInstance: async (id) => {
    await componentInstanceApi.delete(id);
    set((state) => ({
      componentInstances: state.componentInstances.filter((item) => item.id !== id),
      productStepLimits: state.productStepLimits.filter(
        (item) => item.component_instance_id !== id,
      ),
    }));
    await refreshSafely("instances composant", async () => {
      const [componentInstances, productStepLimits] = await Promise.all([
        componentInstanceApi.getAll(),
        productStepLimitApi.getAll(),
      ]);
      set({ componentInstances, productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Composant supprime");
  },

  addProductStepLimit: async (value) => {
    const created = await productStepLimitApi.create(value);
    set((state) => ({ productStepLimits: [...state.productStepLimits, created] }));
    await refreshSafely("valeurs limites produit", async () => {
      const productStepLimits = await productStepLimitApi.getAll();
      set({ productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Limite produit ajoutee");
  },

  updateProductStepLimit: async (id, value) => {
    const updated = await productStepLimitApi.update(id, value);
    set((state) => ({
      productStepLimits: state.productStepLimits.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("valeurs limites produit", async () => {
      const productStepLimits = await productStepLimitApi.getAll();
      set({ productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Limite produit modifiee");
  },

  deleteProductStepLimit: async (id) => {
    await productStepLimitApi.delete(id);
    set((state) => ({
      productStepLimits: state.productStepLimits.filter((item) => item.id !== id),
    }));
    await refreshSafely("valeurs limites produit", async () => {
      const productStepLimits = await productStepLimitApi.getAll();
      set({ productStepLimits });
    });
    await get().reloadHistory();
    showSuccessToast("Limite produit supprimee");
  },

  addExecutionConfig: async (config) => {
    const created = await productExecutionConfigApi.create(config);
    set((state) => ({ executionConfigs: [...state.executionConfigs, created] }));
    await refreshSafely("config execution", async () => {
      const executionConfigs = await productExecutionConfigApi.getAll();
      set({ executionConfigs });
    });
    await reloadHistoryAfterAudit(get().reloadHistory);
    showSuccessToast("Configuration ajoutee");
  },

  updateExecutionConfig: async (id, config) => {
    const updated = await productExecutionConfigApi.update(id, config);
    set((state) => ({
      executionConfigs: state.executionConfigs.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    await refreshSafely("config execution", async () => {
      const executionConfigs = await productExecutionConfigApi.getAll();
      set({ executionConfigs });
    });
    await reloadHistoryAfterAudit(get().reloadHistory);
    showSuccessToast("Configuration modifiee");
  },

  deleteExecutionConfig: async (id) => {
    await productExecutionConfigApi.delete(id);
    set((state) => ({
      executionConfigs: state.executionConfigs.filter((item) => item.id !== id),
    }));
    await refreshSafely("config execution", async () => {
      const executionConfigs = await productExecutionConfigApi.getAll();
      set({ executionConfigs });
    });
    await reloadHistoryAfterAudit(get().reloadHistory);
    showSuccessToast("Configuration supprimee");
  },
}));
