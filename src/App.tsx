import { Loader2 } from "lucide-react";
import { Suspense, lazy } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { RequireAuth } from "./components/common/RequireAuth";
import { Layout } from "./components/layout/Layout";

const HomePage = lazy(() => import("./pages/HomePage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const AddressPage = lazy(() => import("./pages/AddressPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <Loader2 className="h-7 w-7 animate-spin text-brand" aria-label="Loading page" />
    </div>
  );
}

function withErrorBoundary(element: React.ReactNode) {
  return <ErrorBoundary>{element}</ErrorBoundary>;
}

function withSuspense(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter(
  [
    {
      path: "/",
      element: withErrorBoundary(<Layout />),
      errorElement: <ErrorBoundary>{null}</ErrorBoundary>,
      children: [
        { index: true, element: withSuspense(<HomePage />) },
        { path: "search", element: withSuspense(<SearchPage />) },
        { path: "product/:productId", element: withSuspense(<ProductPage />) },
        { path: "cart", element: withSuspense(<CartPage />) },
        { path: "favorites", element: withSuspense(<FavoritesPage />) },
        { path: "address", element: withSuspense(<AddressPage />) },
        { path: "orders", element: withSuspense(<OrdersPage />) },
        { path: "orders/:orderId", element: withSuspense(<OrderDetailPage />) },
        {
          path: "account",
          element: withSuspense(
            <RequireAuth>
              <AccountPage />
            </RequireAuth>,
          ),
        },
        { path: "*", element: withSuspense(<NotFoundPage />) },
      ],
    },
    { path: "/checkout", element: withErrorBoundary(withSuspense(<CheckoutPage />)), errorElement: <ErrorBoundary>{null}</ErrorBoundary> },
    { path: "/payment", element: withErrorBoundary(withSuspense(<PaymentPage />)), errorElement: <ErrorBoundary>{null}</ErrorBoundary> },
    { path: "/login", element: withErrorBoundary(withSuspense(<LoginPage />)), errorElement: <ErrorBoundary>{null}</ErrorBoundary> },
    { path: "/signup", element: withErrorBoundary(withSuspense(<SignupPage />)), errorElement: <ErrorBoundary>{null}</ErrorBoundary> },
  ],
  { future: { v7_relativeSplatPath: true } },
);

export default function App() {
  return <RouterProvider router={router} />;
}
