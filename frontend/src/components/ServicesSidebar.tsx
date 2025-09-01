import { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Badge,
  Box,
  Typography,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  AttachMoney as MoneyIcon,
  PictureAsPdf as PackageIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import { useServiceCounts } from '../hooks/useServiceCounts';

interface ServiceCount {
  pendientes: number;
  asignados: number;
  conRemito: number;
  facturados: number;
}

export default function ServicesSidebar() {
  const [open, setOpen] = useState(true);
  const { counts, refreshCounts } = useServiceCounts();
  const router = useRouter();
  const pathname = usePathname();

  const handleClick = () => {
    setOpen(!open);
  };

  const menuItems = [
    {
      text: 'Registro de Servicio',
      icon: <AssignmentIcon sx={{ color: '#2196f3' }} />,
      count: 0,
      path: '/dashboard/services/pending',
      status: 'PENDIENTE',
    },
    {
      text: 'Asignación',
      icon: <PersonIcon sx={{ color: '#4caf50' }} />,
      count: counts.pendientes,
      path: '/dashboard/services/assigned',
      status: 'ASIGNADO',
    },
    {
      text: 'Remito',
      icon: <ReceiptIcon sx={{ color: '#ff9800' }} />,
      count: counts.asignados,
      path: '/dashboard/services/receipt',
      status: 'CON_REMITO',
    },
    {
      text: 'Facturación',
      icon: <MoneyIcon sx={{ color: '#9c27b0' }} />,
      count: counts.conRemito,
      path: '/dashboard/services/invoiced',
      status: 'CON_REMITO',
    },
    {
      text: 'Paquete',
      icon: <PackageIcon sx={{ color: '#d32f2f' }} />,
      count: 0,
      path: '/dashboard/services/package',
      status: 'FACTURADO',
    },
  ];

  return (
    <List
      sx={{ 
        width: '100%', 
        maxWidth: 360, 
        bgcolor: 'background.paper',
        '& .MuiListItemButton-root': {
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        },
      }}
      component="nav"
    >
      <ListItemButton 
        onClick={handleClick}
        sx={{
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <ListItemIcon>
          <AssignmentIcon sx={{ color: '#2196f3' }} />
        </ListItemIcon>
        <ListItemText 
          primary="Servicios" 
          primaryTypographyProps={{
            fontWeight: 600,
          }}
        />
        {open ? <ExpandLess /> : <ExpandMore />}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {menuItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                sx={{ 
                  pl: 4,
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(33, 150, 243, 0.08)',
                    borderLeft: '3px solid',
                    borderLeftColor: item.icon.props.sx.color,
                    '&:hover': {
                      backgroundColor: 'rgba(33, 150, 243, 0.12)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
                onClick={() => router.push(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text}
                  primaryTypographyProps={{
                    fontSize: '0.9rem',
                    fontWeight: pathname === item.path ? 600 : 400,
                    color: pathname === item.path ? 'primary.main' : 'inherit',
                  }}
                />
                {item.count > 0 && (
                  <Badge
                    badgeContent={item.count}
                    color="primary"
                    sx={{ 
                      mr: 2,
                      '& .MuiBadge-badge': {
                        backgroundColor: item.icon.props.sx.color,
                      },
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Collapse>
    </List>
  );
} 