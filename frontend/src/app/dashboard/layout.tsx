'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Menu,
  MenuItem,
  Avatar
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Business as BuildingIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  ExpandLess,
  ExpandMore,
  AccountCircle as AccountCircleIcon,
  Settings as SettingsIcon,
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';
import ServicesSidebar from '@/components/ServicesSidebar';
import { CategoryProvider } from '@/contexts/CategoryContext';
import api from '@/lib/axios';
import logo from '/public/logo.png';

const drawerWidth = 240;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [servicesOpen, setServicesOpen] = useState(true);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    // Obtener el nombre y rol del usuario autenticado
    const fetchUser = async () => {
      try {
        const res = await api.get('/auth/me');
        setUserName(res.data.name);
        setUserRole(res.data.role);
      } catch (e) {
        setUserName('Usuario');
        setUserRole(null);
      } finally {
        setLoadingUser(false);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (!loadingUser && userRole === 'TECNICO') {
      if (pathname !== '/dashboard/technician') {
        router.replace('/dashboard/technician');
      }
    }
  }, [userRole, loadingUser, pathname, router]);

  // Si es técnico y no está en la ruta correcta, no renderizar nada
  if (loadingUser) return null;
  if (userRole === 'TECNICO' && pathname !== '/dashboard/technician') return null;

  // Si es técnico, ocultar menú y AppBar
  if (userRole === 'TECNICO' && pathname === '/dashboard/technician') {
    return <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', mt: 4 }}>{children}</Box>;
  }

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleServicesClick = () => {
    setServicesOpen(!servicesOpen);
  };

  const handleReportsClick = () => {
    setReportsOpen(!reportsOpen);
  };

  const handleStockClick = () => {
    setStockOpen(!stockOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  const handleProfile = () => {
    handleMenuClose();
    router.push('/dashboard/profile');
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    handleMenuClose();
    router.push('/login');
  };

  const menuItems = [
    {
      text: 'Dashboard',
      icon: <DashboardIcon sx={{ color: '#2196f3' }} />,
      path: '/dashboard',
    },
    {
      text: 'Edificios',
      icon: <BuildingIcon sx={{ color: '#4caf50' }} />,
      path: '/dashboard/buildings',
    },
    {
      text: 'Usuarios',
      icon: <PeopleIcon sx={{ color: '#ff9800' }} />,
      path: '/dashboard/users',
    },
    {
      text: 'Administradores',
      icon: <AssignmentIcon sx={{ color: '#9c27b0' }} />,
      path: '/dashboard/administrators',
    },
    {
      text: 'Stock',
      icon: <InventoryIcon sx={{ color: '#795548' }} />,
      path: '/dashboard/stock',
      subItems: [
        {
          text: 'Inventario',
          path: '/dashboard/stock',
        },
        {
          text: 'Categorías',
          path: '/dashboard/stock/categories',
        },
      ],
    },
    {
      text: 'Configuraciones',
      icon: <SettingsIcon sx={{ color: '#607d8b' }} />,
      path: '/dashboard/settings',
    },
  ];

  const reportItems = [
    {
      text: 'Deuda de Administradores',
      icon: <AssignmentIcon sx={{ color: '#f44336' }} />,
      path: '/dashboard/reports/admin-debt',
    },
    {
      text: 'Deuda de Edificios',
      icon: <BuildingIcon sx={{ color: '#ff5722' }} />,
      path: '/dashboard/reports/building-debt',
    },
  ];

  const drawer = (
    <Box sx={{ overflow: 'auto' }}>
      <List>
        {menuItems.map((item) => {
          // Si el item tiene subItems, renderizar como menú desplegable
          if (item.subItems) {
            const isStock = item.text === 'Stock';
            const isOpen = isStock ? stockOpen : false;
            const handleClick = isStock ? handleStockClick : () => {};
            
            return (
              <Box key={item.text}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={handleClick}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText 
                      primary={item.text} 
                      primaryTypographyProps={{
                        fontWeight: 600,
                      }}
                    />
                    {isOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={isOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.subItems.map((subItem) => (
                      <ListItem key={subItem.text} disablePadding>
                        <ListItemButton
                          selected={pathname === subItem.path}
                          sx={{ 
                            pl: 4,
                            '&.Mui-selected': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              borderLeft: '4px solid',
                              borderLeftColor: item.icon.props.sx.color,
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.08)',
                              },
                            },
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                          onClick={() => router.push(subItem.path)}
                        >
                          <ListItemText 
                            primary={subItem.text}
                            primaryTypographyProps={{
                              fontSize: '0.9rem',
                              fontWeight: pathname === subItem.path ? 600 : 400,
                            }}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </Box>
            );
          }
          
          // Si no tiene subItems, renderizar como item normal
          return (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                selected={pathname === item.path}
                onClick={() => router.push(item.path)}
                sx={{
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    borderLeft: '4px solid',
                    borderLeftColor: item.icon.props.sx.color,
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.08)',
                    },
                  },
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText 
                  primary={item.text} 
                  primaryTypographyProps={{
                    fontWeight: pathname === item.path ? 600 : 400,
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
        
        {/* Menú de Reportes */}
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleReportsClick}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
            }}
          >
            <ListItemIcon>
              <AssessmentIcon sx={{ color: '#e91e63' }} />
            </ListItemIcon>
            <ListItemText 
              primary="Reportes" 
              primaryTypographyProps={{
                fontWeight: 600,
              }}
            />
            {reportsOpen ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={reportsOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {reportItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={pathname === item.path}
                  sx={{ 
                    pl: 4,
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                      borderLeft: '4px solid',
                      borderLeftColor: item.icon.props.sx.color,
                      '&:hover': {
                        backgroundColor: 'rgba(0, 0, 0, 0.08)',
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
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Collapse>
        
        <ServicesSidebar />
      </List>
    </Box>
  );

  return (
    <CategoryProvider>
      <Box sx={{ display: 'flex' }}>
        <Box sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: drawerWidth,
          height: 100,
          bgcolor: 'white',
          zIndex: 1301,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #eee',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}>
          <img 
            src="/logo-menu.png" 
            alt="Garcia Coelho Logo" 
            style={{ 
              height: 70, 
              objectFit: 'contain',
              padding: '10px',
            }} 
          />
        </Box>
        <AppBar
          position="fixed"
          sx={{
            width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
            ml: { sm: `${open ? drawerWidth : 0}px` },
            transition: (theme) =>
              theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            zIndex: 1201,
          }}
        >
          <Toolbar>
            <Box sx={{ flexGrow: 1 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {userName}
              </Typography>
              <IconButton
                color="inherit"
                onClick={handleProfileMenuOpen}
                sx={{ p: 0 }}
              >
                <Avatar sx={{ width: 36, height: 36 }}>
                  <AccountCircleIcon sx={{ width: 32, height: 32 }} />
                </Avatar>
              </IconButton>
            </Box>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              <MenuItem disabled>{userName}</MenuItem>
              <MenuItem onClick={handleProfile}>Configurar mi perfil</MenuItem>
              <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Drawer
          variant="permanent"
          open={open}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              pt: '110px',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${open ? drawerWidth : 0}px)` },
            transition: (theme) =>
              theme.transitions.create(['margin', 'width'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
            mt: 4,
          }}
        >
          {children}
        </Box>
      </Box>
    </CategoryProvider>
  );
} 