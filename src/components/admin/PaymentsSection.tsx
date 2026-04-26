import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CreditCard, Receipt, Settings2, FileCheck2, Building2, BarChart3, ArrowDownUp } from 'lucide-react';
import PaymentsDashboard from './payments/PaymentsDashboard';
import PaymentsTransactions from './payments/PaymentsTransactions';
import PaymentsGateways from './payments/PaymentsGateways';
import PaymentsProofs from './payments/PaymentsProofs';
import PaymentsBankAccounts from './payments/PaymentsBankAccounts';
import PaymentsClipSync from './payments/PaymentsClipSync';

const PaymentsSection = () => {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Centro de Pagos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualiza y gestiona todas las pasarelas, transacciones y verificación de transferencias.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full md:w-auto">
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-2" />Dashboard</TabsTrigger>
          <TabsTrigger value="transactions"><Receipt className="h-4 w-4 mr-2" />Transacciones</TabsTrigger>
          <TabsTrigger value="clip"><ArrowDownUp className="h-4 w-4 mr-2" />Sync Clip</TabsTrigger>
          <TabsTrigger value="proofs"><FileCheck2 className="h-4 w-4 mr-2" />Por verificar</TabsTrigger>
          <TabsTrigger value="gateways"><Settings2 className="h-4 w-4 mr-2" />Pasarelas</TabsTrigger>
          <TabsTrigger value="banks"><Building2 className="h-4 w-4 mr-2" />Cuentas bancarias</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard" className="mt-4"><PaymentsDashboard /></TabsContent>
        <TabsContent value="transactions" className="mt-4"><PaymentsTransactions /></TabsContent>
        <TabsContent value="clip" className="mt-4"><PaymentsClipSync /></TabsContent>
        <TabsContent value="proofs" className="mt-4"><PaymentsProofs /></TabsContent>
        <TabsContent value="gateways" className="mt-4"><PaymentsGateways /></TabsContent>
        <TabsContent value="banks" className="mt-4"><PaymentsBankAccounts /></TabsContent>
      </Tabs>
    </div>
  );
};

export default PaymentsSection;
