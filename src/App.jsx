import { AppProvider, Box, InlineStack, Text } from '@shopify/polaris';
import polarisEn from '@shopify/polaris/locales/en.json';
import {
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useSearchParams,
} from 'react-router-dom';

const pageModules = import.meta.glob('../pages/**/*.jsx', { eager: true });

function slugEntries() {
  return Object.keys(pageModules)
    .map((path) => {
      const m = path.match(/\/pages\/(.+)\.jsx$/);
      if (!m) return null;
      return { slug: m[1], Component: pageModules[path].default };
    })
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function humanizeSlug(slug) {
  return slug
    .split('/')
    .map((part) => part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' › ');
}

function RootRedirect() {
  const { search } = useLocation();
  return <Navigate to={ { pathname: '/pages/home', search } } replace />;
}

function FallbackRedirect() {
  const { search } = useLocation();
  return <Navigate to={ { pathname: '/pages/home', search } } replace />;
}

function Shell() {
  const entries = slugEntries();
  const [ searchParams ] = useSearchParams();
  const qs = searchParams.toString();

  return (
    <>
      <Box paddingBlockEnd="400">
        <InlineStack gap="400" align="start" blockAlign="center">
          <Text variant="headingMd" as="span">
            minishopi
          </Text>
          { entries.map(({ slug }) => (
            <Link
              key={ slug }
              to={ { pathname: `/pages/${ slug }`, search: qs ? `?${ qs }` : '' } }
              style={ { textDecoration: 'none' } }
            >
              <Text variant="bodyMd" as="span">
                { humanizeSlug(slug) }
              </Text>
            </Link>
          )) }
        </InlineStack>
      </Box>
      <Outlet />
    </>
  );
}

export default function App() {
  const entries = slugEntries();

  return (
    <AppProvider i18n={ polarisEn }>
      <Routes>
        <Route path="/" element={ <RootRedirect /> } />
        <Route element={ <Shell /> }>
          { entries.map(({ slug, Component }) => (
            <Route key={ slug } path={ `/pages/${ slug }` } element={ <Component /> } />
          )) }
          <Route path="*" element={ <FallbackRedirect /> } />
        </Route>
      </Routes>
    </AppProvider>
  );
}
