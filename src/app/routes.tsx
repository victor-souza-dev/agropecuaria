import { createBrowserRouter, Navigate } from "react-router";
import Prototype, {
  ModulePage,
  MovementItemsPage,
  MovementDetailPage,
  AuditoriaMovimentacaoPage,
  AprovacaoDetalhePage,
  RequestDetailPage,
  TagDetailPage,
  RangeDetailPage,
  AuditoriaFaixaPage,
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
        path: "estoque/estocador",
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
        path: "historico/:movementId",
        element: <MovementDetailPage />,
      },
      {
        path: "historico/:movementId/auditoria",
        element: <AuditoriaMovimentacaoPage />,
      },
      {
        path: "habilitacao",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "habilitacao/dashboard",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "habilitacao/novo",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "habilitacao/regras",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "habilitacao/auditoria",
        element: <ModulePage page="habilitacao" />,
      },
      {
        path: "habilitacao/estocador-auditoria",
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
        path: "pedidos-sda/:pedidoId",
        element: <AprovacaoDetalhePage />,
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
        path: "automacoes",
        element: <ModulePage page="automacoes" />,
      },
      {
        path: "automacoes/auditoria",
        element: <ModulePage page="automacoes" />,
      },
      {
        path: "numeracao/:rangeId",
        element: <RangeDetailPage />,
      },
      {
        path: "numeracao/:rangeId/auditoria",
        element: <AuditoriaFaixaPage />,
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
