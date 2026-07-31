'use client';

import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import PaymentMethodsManager from '@/components/PaymentMethodsManager';
import ServiceTypesManager from '@/components/ServiceTypesManager';
import NoChargeReasonsManager from '@/components/NoChargeReasonsManager';
import BalanceMaintenanceManager from '@/components/BalanceMaintenanceManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="settings tabs">
          <Tab label="Medios de Pago" />
          <Tab label="Tipos de Servicio" />
          <Tab label="Motivos Sin Cobro" />
          <Tab label="Mantenimiento" />
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        <PaymentMethodsManager />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ServiceTypesManager />
      </TabPanel>
      <TabPanel value={value} index={2}>
        <NoChargeReasonsManager />
      </TabPanel>
      <TabPanel value={value} index={3}>
        <BalanceMaintenanceManager />
      </TabPanel>
    </Box>
  );
}
