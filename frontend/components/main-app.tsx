'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/lib/store-api';
import AppShell from '@/components/app-shell';
import StepsTab from '@/components/tabs/steps-tab';
import SequencesTab from '@/components/tabs/sequences-tab';
import { ProductsTab } from '@/components/tabs/products-tab';
import ExecutionModesTab from '@/components/tabs/execution-modes-tab';
import ExecutionConfigTab from '@/components/tabs/execution-config-tab';
import ProductStepValuesTab from '@/components/tabs/product-step-values-tab';
import ProductLimitValuesTab from '@/components/tabs/product-limit-values-tab';
import RightsTab from '@/components/tabs/rights-tab';
import RolesTab from '@/components/tabs/roles-tab';
import UsersTab from '@/components/tabs/users-tab';
import HistoryTab from '@/components/tabs/history-tab';

export default function MainApp() {
  const { currentUser } = useStore();
  const [activeTab, setActiveTab] = useState('steps');
  const [productStepValuesProductId, setProductStepValuesProductId] = useState<number>(0);
  const [productLimitValuesProductId, setProductLimitValuesProductId] = useState<number>(0);
  const [executionConfigProductId, setExecutionConfigProductId] = useState<number>(0);
  const [executionConfigSequenceId, setExecutionConfigSequenceId] = useState<number>(0);
  const [executionConfigStepId, setExecutionConfigStepId] = useState<number>(0);

  useEffect(() => {
    const handleNavigate = (event: Event) => {
      const customEvent = event as CustomEvent<{
        tab?: string;
        stepId?: number;
        productId?: number;
        sequenceId?: number;
      }>;
      const { tab, stepId, productId, sequenceId } = customEvent.detail || {};

      if (tab === 'product-step-values' && typeof productId === 'number') {
        setProductStepValuesProductId(productId);
      }

      if (tab === 'product-limit-values' && typeof productId === 'number') {
        setProductLimitValuesProductId(productId);
      }

      if (tab === 'execution-config') {
        if (typeof productId === 'number') {
          setExecutionConfigProductId(productId);
        }

        if (typeof sequenceId === 'number') {
          setExecutionConfigSequenceId(sequenceId);
          setExecutionConfigStepId(0);
        }

        if (typeof stepId === 'number') {
          setExecutionConfigStepId(stepId);
          setExecutionConfigSequenceId(0);
        }
      }
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  if (!currentUser) {
    return null;
  }

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-6">
        {activeTab === 'steps' && <StepsTab />}
        {activeTab === 'sequences' && <SequencesTab />}
        {activeTab === 'products' && <ProductsTab />}
        {activeTab === 'execution-modes' && <ExecutionModesTab />}
        {activeTab === 'execution-config' && (
          <ExecutionConfigTab
            key={`${executionConfigProductId}-${executionConfigSequenceId}-${executionConfigStepId}`}
            activeProductId={executionConfigProductId}
            activeSequenceId={executionConfigSequenceId || undefined}
            activeStepId={executionConfigStepId || undefined}
          />
        )}
        {activeTab === 'product-step-values' && (
          <ProductStepValuesTab
            key={productStepValuesProductId}
            activeProductId={productStepValuesProductId}
            onActiveProductIdChange={setProductStepValuesProductId}
          />
        )}
        {activeTab === 'product-limit-values' && (
          <ProductLimitValuesTab
            key={productLimitValuesProductId}
            activeProductId={productLimitValuesProductId}
            onActiveProductIdChange={setProductLimitValuesProductId}
          />
        )}
        {activeTab === 'rights' && <RightsTab />}
        {activeTab === 'roles' && <RolesTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </AppShell>
  );
}
