import { createBrowserRouter, Navigate } from "react-router";
import Prototype, {
  ModulePage,
  MovementItemsPage,
  RequestDetailPage,
  TagDetailPage,
  RangeDetailPage,
} from "./Prototype";

function EmptyRoute() {
  return null;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/loja/estoque" replace />,
  },
  {
    path: "/:role",
    Component: Prototype,
    children: [
      {
        index: true,
        Component: EmptyRoute,
      },
      {
        path: "estoque",
        element: <ModulePage page="estoque" />,
      },
      {
        path: "estoque/brinco/:tagNumber",
        element: <TagDetailPage />,
      },
      {
        path: "recebimento",
        element: <ModulePage page="recebimento" />,
      },
      {
        path: "venda",
        element: <ModulePage page="venda" />,
      },
      {
        path: "historico",
        element: <ModulePage page="historico" />,
      },
      {
        path: "historico/:movementId/itens",
        element: <MovementItemsPage />,
      },
      {
        path: "habilitacao",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "pedidos-sda",
        element: <ModulePage page="pedidos-sda" />,
      },
      {
        path: "pedidos-sda/novo",
        element: <ModulePage page="pedidos-sda-novo" />,
      },
      {
        path: "numeracao",
        element: <ModulePage page="numeracao" />,
      },
      {
        path: "numeracao/dashboard",
        element: <ModulePage page="numeracao" />,
      },
      {
        path: "numeracao/:rangeId",
        element: <RangeDetailPage />,
      },
      {
        path: "pedidos",
        element: <ModulePage page="pedidos" />,
      },
      {
        path: "solicitar",
        element: <ModulePage page="solicitar" />,
      },
      {
        path: "solicitar/:requestId",
        element: <RequestDetailPage />,
      },
      {
        path: "*",
        Component: EmptyRoute,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/loja/estoque" replace />,
  },
]);
