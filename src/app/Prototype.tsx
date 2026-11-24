import { Fragment, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate, useOutletContext, useParams } from "react-router";

type Role = "seapi" | "loja" | "pf" | "fabrica" | "produtor";
type Page =
  | "estoque"
  | "recebimento"
  | "venda"
  | "historico"
  | "habilitacao"
  | "pedidos-sda"
  | "pedidos-sda-novo"
  | "numeracao"
  | "pedidos"
  | "solicitar";
type Modal = null | {
  type: "transferir" | "perda" | "venda" | "devolver" | "estornar";
  id?: number;
};

type PrototypeContext = {
  role: Role;
  producerAdded: string[];
  openModal: (modal: Modal) => void;
  completeReceipt: (message: string, quantity: number) => void;
  startSale: (tags: string[], producer: string) => void;
  saleReset: number;
  moves: typeof initialMoves;
  expanded: number | null;
  setExpanded: (id: number | null) => void;
  notify: (message: string) => void;
  requests: RequestRecord[];
  createRequest: (quantity: number, factory: string) => void;
};

type RequestRecord = {
  id: string;
  factory: string;
  date: string;
  quantity: number;
  status: "Pendente" | "Atendida" | "Recusada";
  updatedAt: string;
};

const roles: { id: Role; label: string; detail: string }[] = [
  { id: "seapi", label: "SEAPI", detail: "Fiscal estadual" },
  { id: "loja", label: "Loja Agropecuária", detail: "Agropecuária Pampa Sul Ltda." },
  { id: "pf", label: "Estoquista PF", detail: "Antônio C. Silveira" },
  { id: "fabrica", label: "Fábrica de brincos", detail: "Identifica Brasil S.A." },
  { id: "produtor", label: "Produtor rural", detail: "João Pedro Fagundes" },
];

const nav: Record<Role, { id: Page; label: string; icon: string }[]> = {
  seapi: [
    { id: "estoque", label: "Estoque", icon: "box" },
    { id: "recebimento", label: "Recebimento", icon: "scan" },
    { id: "historico", label: "Movimentações", icon: "history" },
    { id: "pedidos-sda", label: "Pedidos de brincos", icon: "request" },
    { id: "habilitacao", label: "Habilitações", icon: "users" },
    { id: "numeracao", label: "Gestão de numeração", icon: "hash" },
  ],
  loja: [
    { id: "estoque", label: "Meu estoque", icon: "box" },
    { id: "recebimento", label: "Recebimento", icon: "scan" },
    { id: "venda", label: "Venda ao produtor", icon: "sale" },
    { id: "historico", label: "Movimentações", icon: "history" },
    { id: "solicitar", label: "Solicitar brincos", icon: "request" },
  ],
  pf: [
    { id: "estoque", label: "Meu estoque", icon: "box" },
    { id: "recebimento", label: "Recebimento", icon: "scan" },
    { id: "historico", label: "Movimentações", icon: "history" },
  ],
  fabrica: [
    { id: "pedidos", label: "Fila de pedidos", icon: "factory" },
    { id: "historico", label: "Movimentações", icon: "history" },
  ],
  produtor: [{ id: "estoque", label: "Meu estoque", icon: "box" }],
};

const pageMeta: Record<Page, [string, string]> = {
  estoque: ["Meu estoque", "Consulte os brincos sob custódia e suas situações."],
  recebimento: [
    "Recebimento com leitor",
    "Leia os códigos inicial e final de cada caixa para creditar a faixa no estoque.",
  ],
  venda: ["Venda ao produtor", "Leia cada brinco individualmente para transferir a custódia."],
  historico: [
    "Histórico de movimentações",
    "Rastreabilidade completa das entradas e saídas de brincos.",
  ],
  habilitacao: [
    "Habilitação de estoquistas",
    "Gerencie pessoas físicas, jurídicas, seus atendentes e os perfis de estocador com suas regras de fluxo.",
  ],
  "pedidos-sda": [
    "Pedidos de brincos",
    "Pedidos ao estoque central SDA especificando o ator solicitante — ciclo de aprovação, envio e confirmação por leitura.",
  ],
  numeracao: ["Gestão de numeração", "Controle as faixas emitidas pelo PNIB ou internamente."],
  pedidos: ["Fila de pedidos da fábrica", "Pedidos aguardando produção e declaração de envio."],
  solicitar: ["Solicitar brincos", "Solicite novos brincos a uma fábrica habilitada."],
};

function pageTitle(role: Role, page: Page): string {
  if (role === "seapi" && page === "estoque") return "Estoque — gestão";
  return pageMeta[page][0];
}

function pageSubtitle(role: Role, page: Page): string {
  if (role === "seapi" && page === "estoque")
    return "Visão administrativa: estoques de todos os titulares. Selecione um titular para abrir a posição detalhada dele.";
  return pageMeta[page][1];
}

const stockBase = [
  {
    start: "105430055956039",
    end: "105430055956278",
    qty: 240,
    status: "Disponível",
    source: "Recebido em 16/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "105430055954801",
    end: "105430055954920",
    qty: 120,
    status: "Disponível",
    source: "Recebido em 02/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077183401",
    end: "076210077183420",
    qty: 20,
    status: "Reservado",
    source: "Mov. #MOV-2025-0812",
    fabricante: "Identifica Brasil S.A.",
  },
];

const producerStock = [
  {
    start: "105430055953118",
    end: "105430055953127",
    qty: 10,
    status: "Disponível",
    source: "Compra em 10/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077181902",
    end: "076210077181906",
    qty: 5,
    status: "Usado",
    source: "Compra em 28/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
];

const numberingRanges = [
  { start: "076210077200001", end: "076210077210000", qty: 10000, tipo: "SISBOV", origem: "Interna", situacao: "Distribuída", destino: "Brinco Sul Indústria", dataCadastro: "02/03/2025", fonteInterna: true },
  { start: "076210077220001", end: "076210077226000", qty: 6000, tipo: "SISBOV", origem: "Interna", situacao: "Disponível", destino: null, dataCadastro: "05/05/2025", fonteInterna: true },
  { start: "105430057000001", end: "105430057006000", qty: 6000, tipo: "INTERNACIONAL", origem: "PNIB", situacao: "Distribuída", destino: "Identifica Brasil S.A.", dataCadastro: "01/06/2025", fonteInterna: false },
  { start: "105430057010001", end: "105430057014000", qty: 4000, tipo: "INTERNACIONAL", origem: "Interna", situacao: "Disponível", destino: null, dataCadastro: "12/06/2025", fonteInterna: true },
];

const initialMoves = [
  {
    id: 1847,
    date: "16/06/2025",
    time: "14:32",
    type: "Recebimento",
    from: "Identifica Brasil S.A.",
    to: "Agropecuária Pampa Sul",
    qty: 240,
    read: "2 códigos/caixa",
    state: "Concluído",
    used: false,
    items: "105430055956039 a 105430055956278",
  },
  {
    id: 1841,
    date: "14/06/2025",
    time: "09:18",
    type: "Venda",
    from: "Agropecuária Pampa Sul",
    to: "João Pedro Fagundes",
    qty: 12,
    read: "Unitária",
    state: "Concluído",
    used: false,
    items: "105430055955801 a 105430055955812",
  },
  {
    id: 1836,
    date: "12/06/2025",
    time: "16:05",
    type: "Transferência",
    from: "Agropecuária Pampa Sul",
    to: "Antônio C. Silveira",
    qty: 20,
    read: "Faixa",
    state: "Concluído",
    used: true,
    items: "076210077183401 a 076210077183420",
  },
  {
    id: 1829,
    date: "10/06/2025",
    time: "11:41",
    type: "Perda",
    from: "Agropecuária Pampa Sul",
    to: "—",
    qty: 3,
    read: "Unitária",
    state: "Concluído",
    used: false,
    items: "105430055953790, 105430055953791, 105430055953792",
  },
  {
    id: 1815,
    date: "05/06/2025",
    time: "10:22",
    type: "Devolvido",
    from: "João Pedro Fagundes",
    to: "Agropecuária Pampa Sul",
    qty: 5,
    read: "Sistema",
    state: "Concluído",
    used: false,
    items: "105430055952714 a 105430055952718",
    link: "#MOV-2025-1810",
  },
];

const SEAPI_LABEL = "SEAPI";

const initialRequests: RequestRecord[] = [
  {
    id: "0048",
    factory: SEAPI_LABEL,
    date: "18/06/2025",
    quantity: 240,
    status: "Pendente",
    updatedAt: "18/06/2025 às 15:42",
  },
  {
    id: "0047",
    factory: "Identifica Brasil S.A.",
    date: "12/06/2025",
    quantity: 240,
    status: "Pendente",
    updatedAt: "12/06/2025 às 10:18",
  },
  {
    id: "0039",
    factory: "Brinco Sul Indústria Ltda.",
    date: "28/05/2025",
    quantity: 500,
    status: "Atendida",
    updatedAt: "02/06/2025 às 16:42",
  },
  {
    id: "0031",
    factory: "Identifica Brasil S.A.",
    date: "02/05/2025",
    quantity: 120,
    status: "Recusada",
    updatedAt: "03/05/2025 às 09:27",
  },
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    box: (
      <>
        <path d="m4 7 8-4 8 4-8 4-8-4Z" />
        <path d="m4 7 8 4 8-4v10l-8 4-8-4V7Z" />
        <path d="M12 11v10" />
      </>
    ),
    scan: (
      <>
        <path d="M3 6V4a1 1 0 0 1 1-1h2M18 3h2a1 1 0 0 1 1 1v2M21 18v2a1 1 0 0 1-1 1h-2M6 21H4a1 1 0 0 1-1-1v-2" />
        <path d="M7 8v8M10 8v8M14 8v8M17 8v8" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM17 11l2 2 4-4" />
      </>
    ),
    hash: (
      <>
        <path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18" />
      </>
    ),
    sale: (
      <>
        <path d="M3 3h2l2.4 11.2a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L21 7H6M10 21h.01M18 21h.01" />
      </>
    ),
    request: (
      <>
        <path d="M12 3v12M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </>
    ),
    factory: (
      <>
        <path d="M3 21V9l6 3V9l6 3V5h6v16H3Z" />
        <path d="M7 17h2M13 17h2" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    alert: (
      <>
        <path d="M12 3 2 21h20L12 3Z" />
        <path d="M12 9v5M12 18h.01" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    transfer: (
      <>
        <path d="M17 3l4 4-4 4M3 7h18M7 21l-4-4 4-4M21 17H3" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16M9 11v6M15 11v6M6 7l1 14h10l1-14M9 7V4h6v3" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  };
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.box}
    </svg>
  );
}

function formatTag(value: string) {
  const digits = value.replace(/\D/g, "").padEnd(15, "0").slice(0, 15);
  return `${digits.slice(0, 3)}.${digits.slice(3, 5)}.${digits.slice(5, 14)}-${digits.slice(14)}`;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="toast">
      <span className="toast-check">
        <Icon name="check" size={15} />
      </span>
      <div>
        <strong>Operação concluída</strong>
        <p>{message}</p>
      </div>
      <button onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="page-skeleton" aria-label="Carregando conteúdo">
      <div className="skeleton-line short" />
      <div className="skeleton-line title" />
      <div className="skeleton-line medium" />
      <div className="skeleton-cards">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="skeleton-panel">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export default function Prototype() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const routeRole = params.role;
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const isPedidoSdaFormPage =
    pathSegments.length === 3 && pathSegments[1] === "pedidos-sda" && pathSegments[2] === "novo";
  const routePage = isPedidoSdaFormPage ? "pedidos-sda-novo" : pathSegments[1];
  const role: Role = roles.some((item) => item.id === routeRole) ? (routeRole as Role) : "loja";
  const allowedPages = nav[role].map((item) => item.id);
  const page: Page = allowedPages.includes(routePage as Page)
    ? (routePage as Page)
    : allowedPages[0];
  const isMovementItemsPage =
    page === "historico" &&
    pathSegments.length === 4 &&
    pathSegments[2] !== undefined &&
    pathSegments[3] === "itens";
  const isTagDetailPage =
    page === "estoque" &&
    pathSegments.length === 4 &&
    pathSegments[2] === "brinco" &&
    pathSegments[3] !== undefined;
  const isRequestDetailPage =
    page === "solicitar" && pathSegments.length === 3 && pathSegments[2] !== undefined;
  const isRangeDetailPage =
    page === "numeracao" && pathSegments.length === 3 && pathSegments[2] !== undefined && pathSegments[2] !== "dashboard";
  const isNumeracaoDashboard = page === "numeracao" && pathSegments.length === 3 && pathSegments[2] === "dashboard";
  const headingTitle = isMovementItemsPage
    ? "Itens da movimentação"
    : isTagDetailPage
      ? "Detalhes do brinco"
      : isRequestDetailPage
        ? "Detalhes da solicitação"
        : isRangeDetailPage
          ? "Detalhes da faixa de numeração"
          : pageTitle(role, page);
  const headingDescription = isMovementItemsPage
    ? "Consulte individualmente os brincos vinculados e sua situação na cadeia de custódia."
    : isTagDetailPage
      ? "Acompanhe a identificação, a custódia atual e todo o histórico do item."
      : isRequestDetailPage
        ? "Acompanhe a situação, o atendimento da fábrica e os eventos do pedido."
        : isRangeDetailPage
          ? "Consulte os dados completos da faixa, distribuições associadas e rastreabilidade da numeração."
          : pageSubtitle(role, page);
  const [modal, setModal] = useState<Modal>(null);
  const [toast, setToast] = useState("");
  const [producerAdded, setProducerAdded] = useState<string[]>([]);
  const [pendingSale, setPendingSale] = useState<string[]>([]);
  const [pendingProducer, setPendingProducer] = useState("");
  const [saleReset, setSaleReset] = useState(0);
  const [moves, setMoves] = useState(initialMoves);
  const [requests, setRequests] = useState<RequestRecord[]>(initialRequests);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const currentRole = roles.find((r) => r.id === role)!;

  useEffect(() => {
    const canonicalPath = `/${role}/${page}`;
    if (
      location.pathname !== canonicalPath &&
      !isMovementItemsPage &&
      !isTagDetailPage &&
      !isRequestDetailPage &&
      !isPedidoSdaFormPage &&
      !isRangeDetailPage &&
      !isNumeracaoDashboard
    ) {
      navigate(canonicalPath, { replace: true });
    }
  }, [
    isMovementItemsPage,
    isRequestDetailPage,
    isTagDetailPage,
    location.pathname,
    navigate,
    page,
    role,
  ]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 4200);
  }

  function changeRole(next: Role) {
    const allowed = nav[next].map((item) => item.id);
    const destination = allowed.includes(page) ? page : allowed[0];
    showLoading();
    navigate(`/${next}/${destination}`);
  }

  function showLoading() {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 320);
  }

  function finishMovement(message: string) {
    setModal(null);
    notify(message);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="state-mark">
            <span>RS</span>
          </div>
          <div className="brand-copy">
            <span>PORTAL</span>
            <strong>SEAPI</strong>
          </div>
          <div className="product-name">
            <b>Sistema de Identificação Animal</b>
            <span>Cadeia de Custódia de Brincos</span>
          </div>
        </div>
        <div className="top-actions">
          <div className="environment">
            <span></span> Ambiente de demonstração
          </div>
          <label className="role-picker">
            <span>Visualizando como</span>
            <select value={role} onChange={(e) => changeRole(e.target.value as Role)}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label} — {r.detail}
                </option>
              ))}
            </select>
          </label>
          <div className="avatar">{currentRole.label.slice(0, 2).toUpperCase()}</div>
        </div>
      </header>

      <aside className="sidebar">
        <div className="actor-card">
          <div className="actor-icon">
            {role === "seapi"
              ? "SF"
              : role === "fabrica"
                ? "FB"
                : role === "produtor"
                  ? "PR"
                  : role === "pf"
                    ? "PF"
                    : "PJ"}
          </div>
          <div>
            <small>PERFIL ATIVO</small>
            <strong>{currentRole.label}</strong>
            <span>{currentRole.detail}</span>
          </div>
        </div>
        <nav>
          <small>CADEIA DE CUSTÓDIA</small>
          {nav[role].map((item) => (
            <Link
              key={item.id}
              to={`/${role}/${item.id}`}
              className={page === item.id ? "active" : ""}
              onClick={() => item.id !== page && showLoading()}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {page === item.id && <Icon name="chevron" size={15} />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-help">
          <Icon name="alert" size={19} />
          <div>
            <strong>Precisa de ajuda?</strong>
            <span>Consulte o manual operacional</span>
          </div>
        </div>
        <div className="sidebar-foot">Versão de demonstração 1.4.0</div>
      </aside>

      <main>
        {loading && <PageSkeleton />}
        {!isTagDetailPage && !isNumeracaoDashboard && (
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                Início <span>/</span>
                {isMovementItemsPage ? (
                  <>
                    <Link to={`/${role}/historico`}>Movimentações</Link>
                    <span>/</span> Itens
                  </>
                ) : isRequestDetailPage ? (
                  <>
                    <Link to={`/${role}/solicitar`}>Solicitar brincos</Link>
                    <span>/</span> Detalhes
                  </>
                ) : isRangeDetailPage ? (
                  <>
                    <Link to={`/${role}/numeracao`}>Gestão de numeração</Link>
                    <span>/</span> Detalhes
                  </>
                ) : (
                  pageTitle(role, page)
                )}
              </div>
              <h1>{headingTitle}</h1>
              <p>{headingDescription}</p>
            </div>
            <div className="page-date">
              Dados atualizados em
              <br />
              <strong>18/06/2025, 15:42</strong>
            </div>
          </div>
        )}
        <Outlet
          context={
            {
              role,
              producerAdded,
              openModal: setModal,
              completeReceipt: (message: string, quantity: number) => {
                notify(message);
                setMoves((prev) => [
                  {
                    id: 1848,
                    date: "18/06/2025",
                    time: "15:42",
                    type: "Recebimento",
                    from: "Identifica Brasil S.A.",
                    to: currentRole.detail,
                    qty: quantity,
                    read: "2 códigos/caixa",
                    state: "Concluído",
                    used: false,
                    items: "105430055956039 a 105430055956278",
                  },
                  ...prev,
                ]);
              },
              startSale: (tags: string[], producer: string) => {
                setPendingSale(tags);
                setPendingProducer(producer);
                setModal({ type: "venda" });
              },
              saleReset,
              moves,
              expanded,
              setExpanded,
              notify,
              requests,
              createRequest: (quantity: number, factory: string) => {
                setRequests((current) => {
                  const nextId = String(
                    Math.max(...current.map((request) => Number(request.id))) + 1,
                  ).padStart(4, "0");
                  return [
                    {
                      id: nextId,
                      factory,
                      date: "18/06/2025",
                      quantity,
                      status: "Pendente",
                      updatedAt: "18/06/2025 às 15:42",
                    },
                    ...current,
                  ];
                });
                notify(
                  factory === SEAPI_LABEL
                    ? "Solicitação enviada à SEAPI. Ao atender, a SEAPI escolherá o tipo de brinco e a fábrica — uma faixa dedicada será gerada automaticamente para o pedido."
                    : "Solicitação enviada à fábrica.",
                );
              },
            } satisfies PrototypeContext
          }
        />
      </main>

      {modal?.type === "transferir" && (
        <TransferModal close={() => setModal(null)} finish={finishMovement} />
      )}
      {modal?.type === "perda" && (
        <LossModal close={() => setModal(null)} finish={finishMovement} />
      )}
      {modal?.type === "venda" && (
        <SaleConfirmModal
          close={() => setModal(null)}
          finish={() => {
            if (pendingProducer === "João Pedro Fagundes") {
              setProducerAdded((prev) => [...prev, ...pendingSale]);
            }
            setPendingSale([]);
            setPendingProducer("");
            setSaleReset((value) => value + 1);
            finishMovement(
              "Venda declarada. Brincos creditados imediatamente ao estoque do produtor.",
            );
          }}
          count={pendingSale.length}
          producer={pendingProducer}
        />
      )}
      {modal?.type === "devolver" && (
        <ReverseModal
          close={() => setModal(null)}
          finish={() => {
            setMoves((prev) => [
              {
                id: 1849,
                date: "18/06/2025",
                time: "15:44",
                type: "Devolvido",
                from: "João Pedro Fagundes",
                to: "Agropecuária Pampa Sul",
                qty: 12,
                read: "Sistema",
                state: "Concluído",
                used: false,
                items: "105430055955801 a 105430055955812",
                link: "#MOV-2025-1841",
              },
              ...prev,
            ]);
            finishMovement("Devolução registrada e vinculada ao movimento original.");
          }}
        />
      )}
      {modal?.type === "estornar" && (
        <VoidModal
          close={() => setModal(null)}
          finish={() =>
            finishMovement("Estorno registrado com justificativa e trilha de auditoria.")
          }
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast("")} />}
    </div>
  );
}

export function ModulePage({ page }: { page: Page }) {
  const context = useOutletContext<PrototypeContext>();
  const isNumeracaoDashboard = page === "numeracao" && window.location.pathname.split("/").pop() === "dashboard";

  switch (page) {
    case "estoque":
      return (
        <StockPage
          role={context.role}
          producerAdded={context.producerAdded}
          onModal={context.openModal}
        />
      );
    case "recebimento":
      return <ReceivingPage onSuccess={context.completeReceipt} />;
    case "venda":
      return (
        <SalePage
          key={context.saleReset}
          onConfirm={(tags, producer) => context.startSale(tags, producer)}
        />
      );
    case "historico":
      return (
        <HistoryPage
          role={context.role}
          moves={context.moves}
          expanded={context.expanded}
          setExpanded={context.setExpanded}
          onModal={context.openModal}
        />
      );
    case "habilitacao":
      return <EnablementPage notify={context.notify} />;
    case "pedidos-sda":
      return <PedidosSdaPage notify={context.notify} />;
    case "pedidos-sda-novo":
      return <PedidoSdaFormPage notify={context.notify} role={context.role} />;
    case "numeracao":
      if (isNumeracaoDashboard) {
        return <NumberingDashboard role={context.role} />;
      }
      return <NumberingPage notify={context.notify} role={context.role} />;
    case "pedidos":
      return <FactoryPage notify={context.notify} />;
    case "solicitar":
      return (
        <RequestPage
          role={context.role}
          requests={context.requests}
          onCreate={context.createRequest}
        />
      );
  }
}

export function MovementItemsPage() {
  const { movementId } = useParams();
  const context = useOutletContext<PrototypeContext>();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [currentPage, setCurrentPage] = useState(1);
  const movement = context.moves.find((item) => String(item.id) === movementId);

  if (!movement) {
    return (
      <section className="panel movement-not-found">
        <div className="empty">
          <div>
            <Icon name="alert" size={27} />
          </div>
          <strong>Movimentação não encontrada</strong>
          <span>O registro informado não existe ou não está disponível para este perfil.</span>
          <Link className="btn secondary" to={`/${context.role}/historico`}>
            Voltar ao histórico
          </Link>
        </div>
      </section>
    );
  }

  const firstNumber = movement.items.match(/\d{15}/)?.[0] ?? "105430055956039";
  const movementItems = Array.from({ length: movement.qty }, (_, index) => {
    const number = String(Number(firstNumber) + index).padStart(15, "0");
    const status =
      movement.type === "Perda"
        ? "Perdido"
        : movement.used && index < Math.min(5, movement.qty)
          ? "Usado"
          : movement.type === "Recebimento" || movement.type === "Devolvido"
            ? "Disponível"
            : "Transferido";
    return {
      number,
      status,
      sequence: index + 1,
    };
  });
  const normalizedQuery = query.replace(/\D/g, "");
  const filteredItems = movementItems.filter(
    (item) =>
      (!normalizedQuery || item.number.includes(normalizedQuery)) &&
      (statusFilter === "Todos" || item.status === statusFilter),
  );
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function filterByStatus(value: string) {
    setStatusFilter(value);
    setCurrentPage(1);
  }

  return (
    <>
      <div className="movement-detail-actions">
        <Link className="back-link" to={`/${context.role}/historico`}>
          <span>←</span> Voltar ao histórico
        </Link>
        <span>Movimentação auditável · somente leitura</span>
      </div>

      <section className="movement-overview">
        <article className="movement-primary">
          <span>MOVIMENTAÇÃO</span>
          <strong>#MOV-2025-{movement.id}</strong>
          <Badge
            tone={
              movement.type === "Perda"
                ? "red"
                : movement.type === "Venda"
                  ? "blue"
                  : movement.type === "Devolvido"
                    ? "purple"
                    : "neutral"
            }
          >
            {movement.type}
          </Badge>
        </article>
        <article>
          <span>DATA E HORA</span>
          <strong>{movement.date}</strong>
          <small>{movement.time}</small>
        </article>
        <article>
          <span>ORIGEM</span>
          <strong>{movement.from}</strong>
          <small>Custodiante anterior</small>
        </article>
        <div className="movement-arrow">→</div>
        <article>
          <span>DESTINO</span>
          <strong>{movement.to}</strong>
          <small>Custodiante atual</small>
        </article>
        <article>
          <span>QUANTIDADE</span>
          <strong>{movement.qty}</strong>
          <small>brincos vinculados</small>
        </article>
      </section>

      <section className="panel movement-items-panel">
        <div className="panel-head">
          <div>
            <h2>Brincos vinculados</h2>
            <p>Relação individual dos itens que compõem a movimentação.</p>
          </div>
          <div className="movement-read">
            <Icon name="scan" size={17} />
            <span>
              LEITURA
              <strong>{movement.read}</strong>
            </span>
          </div>
        </div>
        <div className="filters">
          <div className="search-field movement-item-search">
            <Icon name="search" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar número do brinco..."
            />
          </div>
          <select value={statusFilter} onChange={(event) => filterByStatus(event.target.value)}>
            <option>Todos</option>
            <option>Disponível</option>
            <option>Transferido</option>
            <option>Usado</option>
            <option>Perdido</option>
          </select>
          <span className="result-count">{filteredItems.length} itens encontrados</span>
        </div>
        {visibleItems.length > 0 ? (
          <div className="table-wrap">
            <table className="movement-items-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Identificação do brinco</th>
                  <th>Situação atual</th>
                  <th>Origem</th>
                  <th>Destino</th>
                  <th>Conferência</th>
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => (
                  <tr key={item.number}>
                    <td className="item-sequence">{String(item.sequence).padStart(3, "0")}</td>
                    <td>
                      <div className="movement-tag">
                        <span className="barcode-mark" aria-hidden="true" />
                        <strong>{formatTag(item.number)}</strong>
                      </div>
                    </td>
                    <td>
                      <Badge
                        tone={
                          item.status === "Usado" || item.status === "Perdido"
                            ? "red"
                            : item.status === "Disponível"
                              ? "green"
                              : "blue"
                        }
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td>{movement.from}</td>
                    <td>{movement.to}</td>
                    <td>
                      <span className="audit-check">
                        <Icon name="check" size={14} /> Rastreado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty movement-items-empty">
            <div>
              <Icon name="search" size={25} />
            </div>
            <strong>Nenhum item encontrado</strong>
            <span>Altere os filtros ou busque outra numeração.</span>
          </div>
        )}
        <div className="panel-foot">
          <span>
            Exibindo {visibleItems.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filteredItems.length)} de {filteredItems.length} itens
          </span>
          <div className="pagination">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            >
              ‹
            </button>
            <button className="current">{currentPage}</button>
            {currentPage < totalPages && (
              <button onClick={() => setCurrentPage(currentPage + 1)}>{currentPage + 1}</button>
            )}
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            >
              ›
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

export function TagDetailPage() {
  const { tagNumber } = useParams();
  const context = useOutletContext<PrototypeContext>();
  const number = (tagNumber ?? "").replace(/\D/g, "");
  const range = stockBase.find(
    (item) => Number(number) >= Number(item.start) && Number(number) <= Number(item.end),
  );

  if (number.length !== 15 || !range) {
    return (
      <section className="panel movement-not-found">
        <div className="empty">
          <div>
            <Icon name="alert" size={27} />
          </div>
          <strong>Brinco não encontrado</strong>
          <span>O item informado não pertence ao estoque consultado.</span>
          <Link className="btn secondary" to={`/${context.role}/estoque`}>
            Voltar ao estoque
          </Link>
        </div>
      </section>
    );
  }

  const holder =
    context.role === "produtor" ? "João Pedro Fagundes" : "Agropecuária Pampa Sul Ltda.";
  const holderType = context.role === "produtor" ? "Produtor rural" : "Estoquista PJ";

  return (
    <>
      <div className="tag-detail-actions tag-detail-hero">
        <Link
          className="tag-back-link"
          to={`/${context.role}/estoque`}
          aria-label="Voltar ao estoque"
        >
          ←
        </Link>
        <div className="tag-detail-hero-copy">
          <div>
            <h1>Brinco {formatTag(number)}</h1>
            <Badge tone="green">Disponível</Badge>
          </div>
          <p>Sob custódia da Agropecuária Pampa Sul desde 16/06/2025 às 14:32</p>
        </div>
      </div>

      <div className="tag-detail-grid">
        <section className="panel tag-info-panel custody-panel">
          <div className="panel-head">
            <div>
              <h2>Custódia atual</h2>
              <p>Responsável pelo item neste momento</p>
            </div>
            <div className="stat-icon green">
              <Icon name="users" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Titular</dt>
                <dd>{holder}</dd>
              </div>
              <div>
                <dt>Tipo de custodiante</dt>
                <dd>{holderType}</dd>
              </div>
              <div>
                <dt>Município</dt>
                <dd>Bagé/RS</dd>
              </div>
              <div>
                <dt>Entrada no estoque</dt>
                <dd>16/06/2025 às 14:32</dd>
              </div>
              <div>
                <dt>Dias sob custódia</dt>
                <dd>2 dias</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel tag-info-panel origin-panel">
          <div className="panel-head">
            <div>
              <h2>Origem e fabricação</h2>
              <p>Dados da faixa que originou o brinco</p>
            </div>
            <div className="stat-icon blue">
              <Icon name="factory" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Faixa de origem</dt>
                <dd>
                  {formatTag(range.start)} a {formatTag(range.end)}
                </dd>
              </div>
              <div>
                <dt>Origem da numeração</dt>
                <dd>PNIB</dd>
              </div>
              <div>
                <dt>Fábrica</dt>
                <dd>Identifica Brasil S.A.</dd>
              </div>
              <div>
                <dt>Pedido</dt>
                <dd>#PED-2026-0047</dd>
              </div>
              <div>
                <dt>Caixa</dt>
                <dd>Caixa 01 · 2 códigos de barras</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="panel tag-timeline-panel">
        <div className="panel-head">
          <div>
            <h2>Linha do tempo da cadeia de custódia</h2>
            <p>Eventos preservados para rastreabilidade e auditoria.</p>
          </div>
        </div>
        <div className="custody-timeline custody-timeline-refined">
          <article>
            <div className="timeline-marker">
              <Icon name="hash" size={16} />
            </div>
            <div className="timeline-copy">
              <span>04/06/2025 · 09:15</span>
              <strong>Numeração autorizada pelo PNIB</strong>
              <p>Faixa disponibilizada à SEAPI para fabricação.</p>
            </div>
            <Badge tone="blue">Origem</Badge>
          </article>
          <article>
            <div className="timeline-marker">
              <Icon name="factory" size={16} />
            </div>
            <div className="timeline-copy">
              <span>12/06/2025 · 16:40</span>
              <strong>Envio declarado pela fábrica</strong>
              <p>Caixa 01 declarada com código inicial e código final.</p>
            </div>
            <Badge tone="neutral">Fabricação</Badge>
          </article>
          <article className="current">
            <div className="timeline-marker">
              <Icon name="scan" size={16} />
            </div>
            <div className="timeline-copy">
              <span>16/06/2025 · 14:32</span>
              <strong>Recebido pela Agropecuária Pampa Sul</strong>
              <p>Faixa conferida por leitura dos dois códigos da caixa.</p>
              <Link to={`/${context.role}/historico/1847/itens`}>
                #MOV-2025-1847 · Ver movimentação
              </Link>
            </div>
            <Badge tone="green">Custódia atual</Badge>
          </article>
        </div>
      </section>
    </>
  );
}

export function RangeDetailPage() {
  const { rangeId } = useParams();
  const context = useOutletContext<PrototypeContext>();
  const range = numberingRanges.find((r) => r.start === rangeId || r.end === rangeId)
    // Fallback para faixas geradas dinamicamente (pool ou manual) que não estão na const global
    ?? (rangeId ? {
      start: rangeId.padStart(15, "0"),
      end: rangeId.padStart(15, "0"),
      qty: 0,
      tipo: rangeId.startsWith("105") ? "SISBOV" : "INTERNACIONAL",
      origem: "Interna",
      situacao: "Disponível",
      destino: null,
      dataCadastro: new Date().toLocaleDateString("pt-BR"),
      fonteInterna: true,
    } : undefined);

  if (!range) {
    return (
      <section className="panel movement-not-found">
        <div className="empty">
          <div>
            <Icon name="alert" size={27} />
          </div>
          <strong>Faixa não encontrada</strong>
          <span>A faixa de numeração informada não foi localizada.</span>
          <Link className="btn secondary" to={`/${context.role}/numeracao`}>
            Voltar à gestão de numeração
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="tag-detail-actions tag-detail-hero">
        <Link
          className="tag-back-link"
          to={`/${context.role}/numeracao`}
          aria-label="Voltar à gestão de numeração"
        >
          ←
        </Link>
        <div className="tag-detail-hero-copy">
          <div>
            <h1>
              Faixa {formatTag(range.start)} a {formatTag(range.end)}
            </h1>
            <Badge tone={range.situacao === "Disponível" ? "green" : "yellow"}>
              {range.situacao}
            </Badge>
          </div>
          <p>
            {range.qty.toLocaleString("pt-BR")} brincos &middot;{" "}
            {range.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"} &middot;{" "}
            {range.origem === "PNIB" ? "Autorizado pelo PNIB" : "Faixa interna SDA"}
          </p>
        </div>
      </div>

      <div className="tag-detail-grid">
        <section className="panel tag-info-panel custody-panel">
          <div className="panel-head">
            <div>
              <h2>Dados da faixa</h2>
              <p>Informações completas da numeração</p>
            </div>
            <div className="stat-icon blue">
              <Icon name="hash" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Intervalo</dt>
                <dd>
                  {formatTag(range.start)} a {formatTag(range.end)}
                </dd>
              </div>
              <div>
                <dt>Quantidade de brincos</dt>
                <dd>{range.qty.toLocaleString("pt-BR")}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{range.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}</dd>
              </div>
              <div>
                <dt>Origem</dt>
                <dd>{range.origem === "PNIB" ? "PNIB — Programa Nacional de Identificação de Bovinos" : "Interna — faixa gerida pela SDA"}</dd>
              </div>
              <div>
                <dt>Fonte</dt>
                <dd>{range.fonteInterna ? "Produção interna SDA" : "Autorização externa (PNIB)"}</dd>
              </div>
              <div>
                <dt>Data de cadastro</dt>
                <dd>{range.dataCadastro}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel tag-info-panel origin-panel">
          <div className="panel-head">
            <div>
              <h2>Destino e situação</h2>
              <p>Onde a faixa está alocada</p>
            </div>
            <div className="stat-icon green">
              <Icon name="box" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Situação atual</dt>
                <dd>
                  <Badge tone={range.situacao === "Disponível" ? "green" : "yellow"}>
                    {range.situacao}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt>Destinatário</dt>
                <dd>{range.destino ?? "Estoque central SDA"}</dd>
              </div>
              <div>
                <dt>Disponível para distribuição</dt>
                <dd>{range.situacao === "Disponível" ? "Sim" : "Não"}</dd>
              </div>
              <div>
                <dt>Fabricante associado</dt>
                <dd>{range.destino && range.situacao === "Distribuída" ? range.destino : "—"}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <section className="panel tag-timeline-panel">
        <div className="panel-head">
          <div>
            <h2>Linha do tempo da faixa</h2>
            <p>Eventos desde o cadastro até a situação atual.</p>
          </div>
        </div>
        <div className="timeline-alternate">
          <div className="line"></div>
          <div className="timeline-items">
            <div className="timeline-item left">
              <div className="content">
                <small>{range.dataCadastro}</small>
                <h4>
                  {range.origem === "PNIB"
                    ? "Numeração autorizada pelo PNIB"
                    : "Faixa interna cadastrada pela SDA"}
                </h4>
                <p>
                  {range.qty.toLocaleString("pt-BR")} brincos &middot;{" "}
                  {range.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}
                </p>
              </div>
              <div className="dot"></div>
            </div>

            {range.situacao === "Distribuída" && range.destino && (
              <div className="timeline-item right">
                <div className="dot"></div>
                <div className="content">
                  <small>{range.dataCadastro}</small>
                  <h4>Distribuída para {range.destino}</h4>
                  <p>
                    Faixa alocada para fabricação dos brincos sob responsabilidade do destinatário.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function StockPage({
  role,
  producerAdded,
  onModal,
}: {
  role: Role;
  producerAdded: string[];
  onModal: (m: Modal) => void;
}) {
  const [mode, setMode] = useState<"range" | "item">("range");
  const [holder, setHolder] = useState("Agropecuária Pampa Sul Ltda.");
  const isLegado = role === "seapi" && holder.startsWith("Prefeitura Municipal de Bagé");
  const [view, setView] = useState<"titulares" | "detalhe">("titulares");
  const showDetail = !(role === "seapi" && view === "titulares");
  const holderStocks = [
    {
      select: "Agropecuária Pampa Sul Ltda.",
      titular: "Agropecuária Pampa Sul Ltda.",
      perfil: "PJ · LOJA_AGROPECUARIA",
      regime: "NOVO",
      ranges: 2,
      brincos: 360,
    },
    {
      select: "Antônio Carlos Silveira — PF",
      titular: "Antônio Carlos Silveira",
      perfil: "PF · CREDENCIADO",
      regime: "NOVO",
      ranges: 1,
      brincos: 120,
    },
    {
      select: "João Pedro Fagundes — Produtor",
      titular: "João Pedro Fagundes",
      perfil: "PRODUTOR",
      regime: "NOVO",
      ranges: 1,
      brincos: 12,
    },
    {
      select: "Prefeitura Municipal de Bagé — Regime LEGADO",
      titular: "Prefeitura Municipal de Bagé",
      perfil: "PREFEITURA",
      regime: "LEGADO",
      ranges: 4,
      brincos: 960,
    },
    {
      select: "Depósito central SEAPI",
      titular: "Depósito central SEAPI",
      perfil: "ESTOQUE_SDA",
      regime: "NOVO",
      ranges: 3,
      brincos: 1200,
    },
  ];
  const custodiaTotal = holderStocks.reduce((n, h) => n + h.brincos, 0);
  const legadoBrincos = holderStocks
    .filter((h) => h.regime === "LEGADO")
    .reduce((n, h) => n + h.brincos, 0);
  const subFaixasTotal = holderStocks.reduce((n, h) => n + h.ranges, 0);
  const stocks = role === "produtor" ? producerStock : stockBase;
  const total =
    stocks.reduce((n, s) => n + s.qty, 0) + (role === "produtor" ? producerAdded.length : 0);
  const itemRows = [
    "105430055956039",
    "105430055956040",
    "105430055956041",
    "105430055956042",
    "105430055956043",
    "105430055956044",
  ];
  return (
    <>
      {role === "seapi" && view === "detalhe" && (
        <div className="toolbar-card holder-filter">
          <label>
            <span>Titular do estoque</span>
            <select value={holder} onChange={(e) => setHolder(e.target.value)}>
              <option>Agropecuária Pampa Sul Ltda.</option>
              <option>Antônio Carlos Silveira — PF</option>
              <option>João Pedro Fagundes — Produtor</option>
              <option>Prefeitura Municipal de Bagé — Regime LEGADO</option>
              <option>Depósito central SEAPI</option>
            </select>
          </label>
          <button className="btn secondary">
            <Icon name="search" /> Consultar
          </button>
        </div>
      )}
      {isLegado && view === "detalhe" && (
        <div className="danger-banner amber legacy-banner">
          <Icon name="history" />
          <div>
            <strong>Titular em regime LEGADO · somente leitura</strong>
            <span>
              Este estoque é consultado do legado (visão unificada). As movimentações do titular
              seguem no legado até a migração dele para o regime NOVO.
            </span>
          </div>
        </div>
      )}
      <section className="stats-grid">
        {role === "seapi" ? (
          <>
            <article className="stat">
              <div className="stat-icon blue">
                <Icon name="box" />
              </div>
              <div>
                <span>Brincos sob custódia (todos os titulares)</span>
                <strong>{custodiaTotal.toLocaleString("pt-BR")}</strong>
                <small>brincos</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon green">
                <Icon name="users" />
              </div>
              <div>
                <span>Titulares com estoque</span>
                <strong>{holderStocks.length}</strong>
                <small>estoquistas · produtor · SEAPI</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon gray">
                <Icon name="history" />
              </div>
              <div>
                <span>Em regime LEGADO (consulta)</span>
                <strong>{legadoBrincos.toLocaleString("pt-BR")}</strong>
                <small>brincos lidos do legado · somente leitura</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon yellow">
                <Icon name="hash" />
              </div>
              <div>
                <span>Sub-faixas (todos os titulares)</span>
                <strong>{subFaixasTotal}</strong>
                <small>intervalos</small>
              </div>
            </article>
          </>
        ) : (
          <>
            <article className="stat">
              <div className="stat-icon blue">
                <Icon name="box" />
              </div>
              <div>
                <span>Total sob custódia</span>
                <strong>{total.toLocaleString("pt-BR")}</strong>
                <small>brincos</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon green">
                <Icon name="check" />
              </div>
              <div>
                <span>Disponíveis</span>
                <strong>{(total - 20).toLocaleString("pt-BR")}</strong>
                <small>brincos</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon yellow">
                <Icon name="history" />
              </div>
              <div>
                <span>Reservados</span>
                <strong>20</strong>
                <small>brincos</small>
              </div>
            </article>
            <article className="stat">
              <div className="stat-icon gray">
                <Icon name="hash" />
              </div>
              <div>
                <span>Sub-faixas</span>
                <strong>{stocks.length + (producerAdded.length ? 1 : 0)}</strong>
                <small>intervalos</small>
              </div>
            </article>
          </>
        )}
      </section>
      {role === "seapi" && (
        <div className="segmented estoque-tabs">
          <button
            className={view === "titulares" ? "selected" : ""}
            onClick={() => setView("titulares")}
          >
            Titulares (consolidado)
          </button>
          <button
            className={view === "detalhe" ? "selected" : ""}
            onClick={() => setView("detalhe")}
          >
            Estoque do titular
          </button>
        </div>
      )}
      {role === "seapi" && view === "titulares" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Titulares e seus estoques</h2>
              <p>Visão consolidada — clique em um titular para abrir a posição detalhada dele</p>
            </div>
            <Badge tone="blue">{holderStocks.length} titulares</Badge>
          </div>
          <div className="table-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Titular</th>
                  <th>Perfil / natureza</th>
                  <th>Regime</th>
                  <th>Sub-faixas</th>
                  <th>Brincos</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {holderStocks.map((h) => (
                  <tr key={h.name} className={holder === h.select ? "expanded-row" : ""}>
                    <td>
                      <strong>{h.titular}</strong>
                    </td>
                    <td>{h.perfil}</td>
                    <td>
                      <Badge tone={h.regime === "NOVO" ? "blue" : "neutral"}>
                        {h.regime === "NOVO" ? "NOVO" : "Legado · só leitura"}
                      </Badge>
                    </td>
                    <td>{h.ranges}</td>
                    <td>
                      <strong>{h.brincos.toLocaleString("pt-BR")}</strong>
                    </td>
                    <td>
                      <button
                        className="btn secondary"
                        onClick={() => {
                          setHolder(h.select);
                          setView("detalhe");
                        }}
                      >
                        <Icon name="eye" size={15} /> Abrir estoque
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="panel-foot">
            <span>Consolidado de todos os titulares · visão de gestão administrativa</span>
          </div>
        </section>
      )}
      {showDetail && (
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Brincos em estoque</h2>
            <p>
              {role === "seapi"
                ? `${holder} — posição detalhada do titular selecionado`
                : "Posição atual por numeração e situação"}
            </p>
          </div>
          <div className="segmented">
            <button className={mode === "range" ? "selected" : ""} onClick={() => setMode("range")}>
              Por faixa
            </button>
            <button className={mode === "item" ? "selected" : ""} onClick={() => setMode("item")}>
              Por brinco
            </button>
          </div>
        </div>
        <div className="filters">
          <div className="search-field">
            <Icon name="search" />
            <input placeholder="Buscar numeração..." />
          </div>
          <select>
            <option>Todas as situações</option>
            <option>Disponível</option>
            <option>Reservado</option>
            <option>Usado</option>
          </select>
          <span className="result-count">{mode === "range" ? stocks.length : total} registros</span>
        </div>
        {mode === "range" ? (
          <div className="range-list">
            {stocks.map((s, i) => (
              <article className="range-card" key={s.start}>
                <div className="range-stripe"></div>
                <div className="range-main">
                  <div>
                    <span className="eyebrow">FAIXA {String(i + 1).padStart(2, "0")}</span>
                    <strong>
                      {formatTag(s.start)} <em>a</em> {formatTag(s.end)}
                    </strong>
                    <small>{s.source}</small>
                    <small className="range-fabricante">
                      <Icon name="factory" size={11} />
                      Fabricante: {s.fabricante}
                    </small>
                  </div>
                </div>
                <div className="range-qty">
                  <strong>{s.qty}</strong>
                  <span>brincos</span>
                </div>
                <Badge
                  tone={
                    s.status === "Disponível" ? "green" : s.status === "Usado" ? "red" : "yellow"
                  }
                >
                  {s.status}
                </Badge>
                {role !== "produtor" && !isLegado && (
                  <div className="row-actions">
                    <button onClick={() => onModal({ type: "transferir" })}>
                      <Icon name="transfer" /> Transferir
                    </button>
                    <button className="danger-link" onClick={() => onModal({ type: "perda" })}>
                      <Icon name="trash" /> Perda
                    </button>
                  </div>
                )}
              </article>
            ))}
            {role === "produtor" && producerAdded.length > 0 && (
              <article className="range-card fresh">
                <div className="range-stripe"></div>
                <div className="range-main">
                  <div>
                    <span className="eyebrow">CRÉDITO IMEDIATO · AGORA</span>
                    <strong>
                      {formatTag(producerAdded[0])} <em>a</em>{" "}
                      {formatTag(producerAdded[producerAdded.length - 1])}
                    </strong>
                    <small>Venda pela Agropecuária Pampa Sul</small>
                  </div>
                </div>
                <div className="range-qty">
                  <strong>{producerAdded.length}</strong>
                  <span>brincos</span>
                </div>
                <Badge tone="green">Disponível</Badge>
              </article>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Identificação do brinco</th>
                  <th>Faixa</th>
                  <th>Fabricante</th>
                  <th>Situação</th>
                  <th>Entrada no estoque</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {itemRows.map((tag) => (
                  <tr key={tag}>
                    <td className="tag-number">
                      <Link to={`/${role}/estoque/brinco/${tag}`}>{formatTag(tag)}</Link>
                    </td>
                    <td>
                      <Link to={`/${role}/estoque/brinco/${tag}`}>Faixa 01</Link>
                    </td>
                    <td>Identifica Brasil S.A.</td>
                    <td>
                      <Badge tone="green">Disponível</Badge>
                    </td>
                    <td>16/06/2025</td>
                    <td>
                      <Link
                        className="icon-btn detail-link"
                        to={`/${role}/estoque/brinco/${tag}`}
                        aria-label={`Ver detalhes do brinco ${formatTag(tag)}`}
                        title="Ver detalhes do brinco"
                      >
                        <Icon name="eye" size={17} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-foot">
          <span>
            Exibindo {mode === "range" ? stocks.length : 6} de{" "}
            {mode === "range" ? stocks.length : total} registros
          </span>
          <div className="pagination">
            <button disabled>‹</button>
            <button className="current">1</button>
            <button>2</button>
            <button>3</button>
            <button>›</button>
          </div>
        </div>
      </section>
      )}
    </>
  );
}

function ReceivingPage({ onSuccess }: { onSuccess: (message: string, quantity: number) => void }) {
  const [startCode, setStartCode] = useState("");
  const [endCode, setEndCode] = useState("");
  const [boxes, setBoxes] = useState<
    { id: number; start: string; end: string; quantity: number }[]
  >([]);
  const [error, setError] = useState("");
  const totalQuantity = boxes.reduce((total, box) => total + box.quantity, 0);

  function normalizeCode(value: string) {
    return value.replace(/\D/g, "");
  }

  function addBox(startValue = startCode, endValue = endCode) {
    const start = normalizeCode(startValue);
    const end = normalizeCode(endValue);
    if (
      start.length !== 15 ||
      end.length !== 15 ||
      !/^(105|076)/.test(start) ||
      !/^(105|076)/.test(end)
    ) {
      setError("Leia os dois códigos de 15 dígitos impressos na caixa.");
      return;
    }
    if (Number(end) < Number(start)) {
      setError("O código final deve ser maior ou igual ao código inicial.");
      return;
    }
    if (boxes.some((box) => box.start === start && box.end === end)) {
      setError("Esta caixa já foi adicionada à conferência.");
      return;
    }
    setBoxes((current) => [
      ...current,
      {
        id: Date.now(),
        start,
        end,
        quantity: Number(end) - Number(start) + 1,
      },
    ]);
    setStartCode("");
    setEndCode("");
    setError("");
  }

  return (
    <div className="two-col">
      <div>
        <section className="panel scanner-panel">
          <div className="scanner-title">
            <div className="scanner-icon">
              <Icon name="scan" size={26} />
            </div>
            <div>
              <h2>Leia os dois códigos da caixa</h2>
              <p>Cada caixa contém uma única faixa, definida pelo código inicial e pelo final.</p>
            </div>
          </div>
          <div className="box-rule-note">
            <div>
              <Icon name="box" size={18} />
              <strong>1 caixa</strong>
            </div>
            <span>equivale a</span>
            <div>
              <Icon name="hash" size={18} />
              <strong>1 faixa</strong>
            </div>
            <span>identificada por</span>
            <div>
              <Icon name="scan" size={18} />
              <strong>2 códigos de barras</strong>
            </div>
          </div>
          <div className="dual-barcode-reader">
            <label className={`scan-input ${error ? "has-error" : ""}`}>
              <span>1 · CÓDIGO INICIAL DA FAIXA</span>
              <div>
                <Icon name="scan" />
                <input
                  autoFocus
                  value={startCode}
                  onChange={(event) => setStartCode(event.target.value)}
                  placeholder="Leia os 15 dígitos iniciais"
                />
                <button onClick={() => setStartCode("105430055956039")}>Simular</button>
              </div>
            </label>
            <div className="barcode-connector">→</div>
            <label className={`scan-input ${error ? "has-error" : ""}`}>
              <span>2 · CÓDIGO FINAL DA FAIXA</span>
              <div>
                <Icon name="scan" />
                <input
                  value={endCode}
                  onChange={(event) => setEndCode(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addBox()}
                  placeholder="Leia os 15 dígitos finais"
                />
                <button onClick={() => setEndCode("105430055956278")}>Simular</button>
              </div>
            </label>
          </div>
          {error && (
            <p className="dual-reader-error">
              <Icon name="alert" size={14} />
              {error}
            </p>
          )}
          <div className="add-box-action">
            <span>
              <kbd>Enter</kbd> no código final também adiciona a caixa.
            </span>
            <button
              className="btn secondary"
              disabled={!startCode || !endCode}
              onClick={() => addBox()}
            >
              <Icon name="plus" size={15} /> Adicionar caixa à conferência
            </button>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Caixas lidas</h2>
              <p>
                {boxes.length
                  ? `${boxes.length} ${boxes.length === 1 ? "caixa" : "caixas"} · ${totalQuantity} brincos no total`
                  : "Aguardando a leitura dos dois códigos"}
              </p>
            </div>
          </div>
          {boxes.length === 0 ? (
            <div className="empty">
              <div>
                <Icon name="scan" size={27} />
              </div>
              <strong>Nenhuma caixa adicionada</strong>
              <span>Leia o código inicial e o código final da primeira caixa.</span>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Caixa</th>
                    <th>Código inicial</th>
                    <th>Código final</th>
                    <th>Quantidade</th>
                    <th>Conferência</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {boxes.map((box, index) => (
                    <tr key={box.id}>
                      <td>
                        <strong>Caixa {String(index + 1).padStart(2, "0")}</strong>
                        <small className="two-code-label">2 códigos · 1 faixa</small>
                      </td>
                      <td className="tag-number">{formatTag(box.start)}</td>
                      <td className="tag-number">{formatTag(box.end)}</td>
                      <td>
                        <strong>{box.quantity}</strong>
                      </td>
                      <td>
                        <Badge
                          tone={
                            box.start === "105430055956039" && box.end === "105430055956278"
                              ? "green"
                              : "red"
                          }
                        >
                          {box.start === "105430055956039" && box.end === "105430055956278"
                            ? "Conforme"
                            : "Divergente"}
                        </Badge>
                      </td>
                      <td>
                        <button
                          className="icon-btn"
                          onClick={() =>
                            setBoxes((current) => current.filter((item) => item.id !== box.id))
                          }
                        >
                          <Icon name="trash" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="confirm-bar">
            <span>
              <Icon name="alert" /> Ao confirmar, a faixa inteira será expandida e creditada no
              estoque. Cada caixa gera exatamente uma faixa.
            </span>
            <button
              className="btn primary"
              disabled={!boxes.length}
              onClick={() => {
                onSuccess("Brincos recebidos — estoque creditado.", totalQuantity);
                setBoxes([]);
              }}
            >
              <Icon name="check" /> Confirmar recebimento
            </button>
          </div>
        </section>
      </div>
      <aside className="context-card">
        <div className="context-head">
          <span>Pedido esperado</span>
          <Badge tone="yellow">Pendente</Badge>
        </div>
        <strong>#PED-2025-0047</strong>
        <dl>
          <div>
            <dt>Fábrica</dt>
            <dd>Identifica Brasil S.A.</dd>
          </div>
          <div>
            <dt>Quantidade</dt>
            <dd>240 brincos</dd>
          </div>
          <div>
            <dt>Caixas esperadas</dt>
            <dd>1 caixa · 2 códigos</dd>
          </div>
          <div>
            <dt>Envio declarado</dt>
            <dd>16/06/2025</dd>
          </div>
        </dl>
        <div className="expected-range">
          <span>FAIXA ESPERADA</span>
          <strong>{formatTag("105430055956039")}</strong>
          <i>até</i>
          <strong>{formatTag("105430055956278")}</strong>
        </div>
        <p className="info-note">
          <Icon name="alert" /> A leitura só fica completa após os códigos inicial e final da caixa.
          Divergências serão destacadas antes da confirmação.
        </p>
      </aside>
    </div>
  );
}

function SalePage({ onConfirm }: { onConfirm: (tags: string[], producer: string) => void }) {
  const stockRanges = [
    {
      id: "FX-001",
      start: "105430055956039",
      end: "105430055956278",
      received: "16/06/2025",
    },
    {
      id: "FX-002",
      start: "105430055954801",
      end: "105430055954920",
      received: "02/06/2025",
    },
    {
      id: "FX-003",
      start: "076210077183401",
      end: "076210077183420",
      received: "28/05/2025",
    },
    {
      id: "FX-004",
      start: "105430055953118",
      end: "105430055953127",
      received: "10/05/2025",
    },
    {
      id: "FX-005",
      start: "076210077181700",
      end: "076210077181749",
      received: "22/04/2025",
    },
  ].map((range) => ({
    ...range,
    quantity: Number(range.end) - Number(range.start) + 1,
  }));
  const stockItems = stockRanges.flatMap((range) =>
    Array.from({ length: range.quantity }, (_, index) => ({
      number: String(Number(range.start) + index).padStart(15, "0"),
      rangeId: range.id,
    })),
  );
  const producers = [
    {
      id: "RS-4314902-0187",
      name: "João Pedro Fagundes",
      initials: "JF",
      document: "CPF 486.***.***-15",
      city: "Bagé/RS",
    },
    {
      id: "RS-4300406-0221",
      name: "Ana Lúcia Dornelles",
      initials: "AD",
      document: "CPF 731.***.***-04",
      city: "Alegrete/RS",
    },
    {
      id: "RS-4316907-0094",
      name: "Carlos Eduardo Silveira",
      initials: "CS",
      document: "CPF 205.***.***-61",
      city: "Santa Maria/RS",
    },
  ];
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedProducer, setSelectedProducer] = useState<(typeof producers)[number] | null>(null);
  const [saleMode, setSaleMode] = useState<"unit" | "range">("unit");
  const [scan, setScan] = useState("");
  const [rangeScan, setRangeScan] = useState("");
  const [selectedRangeIds, setSelectedRangeIds] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  const filteredProducers = producers.filter((producer) =>
    `${producer.name} ${producer.document} ${producer.id}`
      .toLocaleLowerCase("pt-BR")
      .includes(normalizedQuery),
  );

  function selectProducer(producer: (typeof producers)[number]) {
    setSelectedProducer(producer);
    setQuery(producer.name);
    setShowResults(false);
  }

  function changeSaleMode(mode: "unit" | "range") {
    setSaleMode(mode);
    setTags([]);
    setScan("");
    setRangeScan("");
    setSelectedRangeIds([]);
    setError("");
  }

  function isAvailable(tag: string) {
    const value = Number(tag);
    return stockRanges.some((range) => value >= Number(range.start) && value <= Number(range.end));
  }

  function read(tag = scan) {
    const clean = tag.replace(/\D/g, "");
    if (tags.includes(clean)) setError("Este brinco já foi lido nesta venda.");
    else if (clean.length !== 15 || !isAvailable(clean))
      setError("Brinco indisponível, usado ou não pertence ao estoque da loja.");
    else {
      setTags((prev) => [...prev, clean]);
      setError("");
      setScan("");
    }
  }

  function expandRange(range: (typeof stockRanges)[number]) {
    return Array.from({ length: range.quantity }, (_, index) =>
      String(Number(range.start) + index).padStart(15, "0"),
    );
  }

  function readRange(raw = rangeScan) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length !== 30) {
      setError("Leia o código de barras da caixa — 30 dígitos (início + fim).");
      return;
    }
    const start = digits.slice(0, 15);
    const end = digits.slice(15);
    const range = stockRanges.find((item) => item.start === start && item.end === end);
    if (!range) {
      setError("Faixa não encontrada no estoque — confira o código de barras da caixa.");
      return;
    }
    if (selectedRangeIds.includes(range.id)) {
      setError("Esta faixa já foi lida nesta venda.");
      return;
    }
    setSelectedRangeIds((current) => [...current, range.id]);
    setTags((current) => [...new Set([...current, ...expandRange(range)])]);
    setError("");
    setRangeScan("");
  }

  function removeRange(rangeId: string) {
    const range = stockRanges.find((item) => item.id === rangeId);
    const rangeTags = new Set(range ? expandRange(range) : []);
    setSelectedRangeIds((current) => current.filter((id) => id !== rangeId));
    setTags((current) => current.filter((tag) => !rangeTags.has(tag)));
    setError("");
  }

  function toggleTag(tag: string) {
    setTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
    setError("");
  }

  function rangeIdOf(tag: string) {
    const value = Number(tag);
    return stockRanges.find((range) => value >= Number(range.start) && value <= Number(range.end))
      ?.id;
  }
  return (
    <div className="two-col sale-layout">
      <div>
        <section className="panel form-section">
          <div className="section-number">1</div>
          <div className="section-body">
            <h2>Identifique o produtor</h2>
            <p>Busque por nome, CPF ou número do estabelecimento rural.</p>
            <div className="producer-search">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedProducer(null);
                  setShowResults(e.target.value.trim().length >= 2);
                }}
                onFocus={() => query.trim().length >= 2 && setShowResults(true)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setShowResults(true);
                }}
                placeholder="Buscar produtor..."
              />
              <button className="btn secondary" onClick={() => setShowResults(true)}>
                Buscar
              </button>
            </div>
            {showResults && (
              <div className="producer-results" role="listbox" aria-label="Resultados da busca">
                {filteredProducers.length > 0 ? (
                  filteredProducers.map((producer) => (
                    <button
                      key={producer.id}
                      type="button"
                      role="option"
                      aria-selected={selectedProducer?.id === producer.id}
                      onClick={() => selectProducer(producer)}
                    >
                      <div className="initials">{producer.initials}</div>
                      <div>
                        <strong>{producer.name}</strong>
                        <span>
                          {producer.document} · {producer.city}
                        </span>
                        <small>Estabelecimento {producer.id}</small>
                      </div>
                      <span className="select-producer">Selecionar</span>
                    </button>
                  ))
                ) : (
                  <div className="producer-no-results">
                    <strong>Nenhum produtor encontrado</strong>
                    <span>Revise o nome, CPF ou número do estabelecimento.</span>
                  </div>
                )}
              </div>
            )}
            {selectedProducer && (
              <div className="selected-producer">
                <div className="initials">{selectedProducer.initials}</div>
                <div>
                  <strong>{selectedProducer.name}</strong>
                  <span>
                    {selectedProducer.document} · Estab. {selectedProducer.id}
                  </span>
                </div>
                <Badge tone="green">Regular</Badge>
                <button
                  type="button"
                  className="change-producer"
                  onClick={() => {
                    setSelectedProducer(null);
                    setQuery("");
                    setShowResults(true);
                  }}
                >
                  Trocar
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="panel form-section">
          <div className="section-number">2</div>
          <div className="section-body">
            <div className="sale-mode-heading">
              <div>
                <h2>
                  {saleMode === "unit"
                    ? "Leia os brincos"
                    : "Leia as faixas de numeração"}
                </h2>
                <p>
                  {saleMode === "unit"
                    ? "Composição exclusivamente por leitura de código de barras — seleção manual não é permitida (RN-015)."
                    : "Leia o código de barras da caixa (início + fim) — a seleção manual de faixas não é permitida (RN-015)."}
                </p>
              </div>
              <div className="segmented sale-mode-toggle">
                <button
                  className={saleMode === "unit" ? "selected" : ""}
                  onClick={() => changeSaleMode("unit")}
                >
                  Unitária
                </button>
                <button
                  className={saleMode === "range" ? "selected" : ""}
                  onClick={() => changeSaleMode("range")}
                >
                  Por faixa
                </button>
              </div>
            </div>
            {saleMode === "unit" ? (
              <>
                <label
                  className={`scan-input compact ${error ? "has-error" : ""}`}
                >
                  <span>LER CÓDIGO DE BARRAS DO BRINCO</span>
                  <div>
                    <Icon name="scan" />
                    <input
                      value={scan}
                      onChange={(e) => setScan(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && read()}
                      placeholder="Leia o código de barras — 15 dígitos"
                    />
                    <button
                      onClick={() => {
                        const next = stockItems.find((item) => !tags.includes(item.number));
                        read(next?.number || "");
                      }}
                    >
                      Simular leitura
                    </button>
                  </div>
                  {error && (
                    <small>
                      <Icon name="alert" size={14} />
                      {error}
                    </small>
                  )}
                </label>
                <div className="stock-picker-head">
                  <div>
                    <strong>Brincos lidos nesta venda</strong>
                    <span>
                      {tags.length} {tags.length === 1 ? "brinco" : "brincos"} · leitura
                      exclusiva por código de barras
                    </span>
                  </div>
                  {tags.length > 0 && (
                    <button className="text-btn muted-action" onClick={() => setTags([])}>
                      Limpar
                    </button>
                  )}
                </div>
                {tags.length === 0 ? (
                  <div className="stock-picker-empty">
                    <Icon name="scan" size={22} />
                    <span>
                      Nenhum brinco lido — a composição da venda é exclusivamente por
                      leitura de código de barras (RN-015).
                    </span>
                  </div>
                ) : (
                  <div className="stock-item-table">
                    <div className="stock-item-picker-header read-header">
                      <span />
                      <span>Brinco lido</span>
                      <span>Faixa</span>
                      <span>Situação</span>
                    </div>
                    <div className="stock-item-picker">
                      {tags.map((tag) => (
                        <div className="read-row" key={tag}>
                          <span className="read-check">
                            <Icon name="check" size={13} />
                          </span>
                          <span className="stock-item-number">{formatTag(tag)}</span>
                          <span className="stock-item-range">{rangeIdOf(tag) ?? "—"}</span>
                          <Badge tone="green">Lido</Badge>
                          <button
                            className="read-remove"
                            onClick={() => toggleTag(tag)}
                            aria-label="Remover brinco lido"
                          >
                            <Icon name="close" size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <label
                  className={`scan-input compact ${error ? "has-error" : ""}`}
                >
                  <span>LER CÓDIGO DE BARRAS DA CAIXA (INÍCIO + FIM)</span>
                  <div>
                    <Icon name="scan" />
                    <input
                      value={rangeScan}
                      onChange={(e) => setRangeScan(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && readRange()}
                      placeholder="Leia o código da caixa — 30 dígitos (início + fim)"
                    />
                    <button
                      onClick={() => {
                        const nextRange = stockRanges.find(
                          (range) => !selectedRangeIds.includes(range.id),
                        );
                        readRange(nextRange ? `${nextRange.start}${nextRange.end}` : "");
                      }}
                    >
                      Simular leitura
                    </button>
                  </div>
                  {error && (
                    <small>
                      <Icon name="alert" size={14} />
                      {error}
                    </small>
                  )}
                </label>
                <div className="stock-picker-head">
                  <div>
                    <strong>Faixas lidas nesta venda</strong>
                    <span>
                      {selectedRangeIds.length}{" "}
                      {selectedRangeIds.length === 1 ? "faixa" : "faixas"} ·{" "}
                      {tags.length} brincos
                    </span>
                  </div>
                  {selectedRangeIds.length > 0 && (
                    <button
                      className="text-btn muted-action"
                      onClick={() => {
                        setSelectedRangeIds([]);
                        setTags([]);
                      }}
                    >
                      Limpar
                    </button>
                  )}
                </div>
                {selectedRangeIds.length === 0 ? (
                  <div className="stock-picker-empty">
                    <Icon name="scan" size={22} />
                    <span>
                      Nenhuma faixa lida — a seleção por faixa é exclusivamente por
                      leitura do código de barras da caixa (RN-015).
                    </span>
                  </div>
                ) : (
                  <div className="stock-item-table">
                    <div className="stock-item-picker-header read-header">
                      <span />
                      <span>Faixa lida</span>
                      <span>Brincos</span>
                      <span>Situação</span>
                    </div>
                    <div className="stock-item-picker">
                      {stockRanges
                        .filter((range) => selectedRangeIds.includes(range.id))
                        .map((range) => (
                          <div className="read-row" key={range.id}>
                            <span className="read-check">
                              <Icon name="check" size={13} />
                            </span>
                            <span className="read-range-cell">
                              <small>
                                {range.id} · Entrada em {range.received}
                              </small>
                              <strong>
                                {formatTag(range.start)} <i>a</i> {formatTag(range.end)}
                              </strong>
                            </span>
                            <span className="stock-item-range">{range.quantity}</span>
                            <Badge tone="green">Lida</Badge>
                            <button
                              className="read-remove"
                              onClick={() => removeRange(range.id)}
                              aria-label="Remover faixa lida"
                            >
                              <Icon name="close" size={13} />
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </div>
      <aside className="sale-summary">
        <div className="summary-head">
          <Icon name="sale" />
          <h2>Resumo da venda</h2>
        </div>
        <dl>
          <div>
            <dt>Produtor</dt>
            <dd>{selectedProducer?.name || "Não selecionado"}</dd>
          </div>
          <div>
            <dt>Brincos lidos</dt>
            <dd className="big">{tags.length}</dd>
          </div>
          <div>
            <dt>Método de leitura</dt>
            <dd>
              {saleMode === "unit"
                ? "Código de barras — unitária"
                : "Código de barras — faixa"}
            </dd>
          </div>
          <div>
            <dt>Situação</dt>
            <dd>
              <Badge tone={tags.length ? "green" : "neutral"}>
                {tags.length ? "Validado" : "Aguardando"}
              </Badge>
            </dd>
          </div>
        </dl>
        <div className="definitive-note">
          <Icon name="alert" />
          <p>
            <strong>Venda definitiva</strong>Após confirmar, os brincos serão creditados
            imediatamente ao produtor.
          </p>
        </div>
        <button
          className="btn primary full"
          disabled={!selectedProducer || !tags.length}
          onClick={() => selectedProducer && onConfirm(tags, selectedProducer.name)}
        >
          Revisar e declarar venda
        </button>
      </aside>
    </div>
  );
}

function HistoryPage({
  role,
  moves,
  expanded,
  setExpanded,
  onModal,
}: {
  role: Role;
  moves: typeof initialMoves;
  expanded: number | null;
  setExpanded: (n: number | null) => void;
  onModal: (m: Modal) => void;
}) {
  return (
    <section className="panel">
      <div className="filters history-filters">
        <div className="search-field">
          <Icon name="search" />
          <input placeholder="Buscar origem, destino ou movimento..." />
        </div>
        <select>
          <option>Todos os tipos</option>
          <option>Venda</option>
          <option>Recebimento</option>
          <option>Transferência</option>
          <option>Devolução</option>
          <option>Perda</option>
          <option>Estorno</option>
        </select>
        <select>
          <option>Últimos 30 dias</option>
          <option>Últimos 90 dias</option>
        </select>
        <button className="btn secondary">Filtrar</button>
      </div>
      <div className="table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Movimento</th>
              <th>Data</th>
              <th>Tipo</th>
              <th>Origem → Destino</th>
              <th>Leitura</th>
              <th>Qtd.</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((m) => (
              <Fragment key={m.id}>
                <tr className={expanded === m.id ? "expanded-row" : ""}>
                  <td>
                    <button
                      className="movement-id"
                      onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                    >
                      #MOV-2025-{m.id} <span>{expanded === m.id ? "⌃" : "⌄"}</span>
                    </button>
                  </td>
                  <td>
                    {m.date}
                    <small>{m.time}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        m.type === "Perda"
                          ? "red"
                          : m.type === "Devolvido"
                            ? "purple"
                            : m.type === "Venda"
                              ? "blue"
                              : "neutral"
                      }
                    >
                      {m.type}
                    </Badge>
                  </td>
                  <td className="route-cell">
                    <strong>{m.from}</strong>
                    <span>→ {m.to}</span>
                  </td>
                  <td>{m.read}</td>
                  <td>
                    <strong>{m.qty}</strong>
                  </td>
                  <td>
                    <Badge tone="green">{m.state}</Badge>
                  </td>
                  <td>
                    <div className="action-cell">
                      {["Venda", "Transferência"].includes(m.type) && (
                        <button
                          className="text-btn"
                          disabled={m.used}
                          title={m.used ? "Brinco já aplicado — requer estorno da SEAPI" : "Devolver movimento"}
                          onClick={() => onModal({ type: "devolver", id: m.id })}
                        >
                          Devolver
                        </button>
                      )}
                      {role === "seapi" && m.used && (
                        <button
                          className="text-btn danger-link"
                          onClick={() => onModal({ type: "estornar", id: m.id })}
                        >
                          Estornar
                        </button>
                      )}
                      <button
                        className="icon-btn"
                        onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                      >
                        <Icon name="eye" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === m.id && (
                  <tr className="detail-row">
                    <td colSpan={8}>
                      <div>
                        <section>
                          <span>ITENS DO MOVIMENTO</span>
                          <strong>{m.items}</strong>
                        </section>
                        <section>
                          <span>REGISTRADO POR</span>
                          <strong>Mariana T. Oliveira</strong>
                          <small>Usuário institucional · IP 10.44.18.72</small>
                        </section>
                        {m.link && (
                          <section>
                            <span>MOVIMENTO VINCULADO</span>
                            <a>{m.link} · Venda original</a>
                          </section>
                        )}
                        <Link className="btn secondary" to={`/${role}/historico/${m.id}/itens`}>
                          Ver todos os itens
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="panel-foot">
        <span>Exibindo {moves.length} movimentações</span>
        <div className="pagination">
          <button disabled>‹</button>
          <button className="current">1</button>
          <button>2</button>
          <button>›</button>
        </div>
      </div>
    </section>
  );
}

function EnablementPage({ notify }: { notify: (m: string) => void }) {
  const [tab, setTab] = useState<"holders" | "profiles">("holders");
  const [showEnable, setShowEnable] = useState(false);
  const [regime, setRegime] = useState<"NOVO" | "LEGADO">("NOVO");
  const [enableNatureza, setEnableNatureza] = useState<"PJ" | "PF">("PJ");
  const [natureza, setNatureza] = useState<"ALL" | "PJ" | "PF">("ALL");
  const holders = [
    {
      name: "Agropecuária Pampa Sul Ltda.",
      doc: "CNPJ 92.841.760/0001-08",
      city: "Bagé/RS",
      type: "PJ",
      active: true,
      regime: "NOVO",
      profile: "LOJA_AGROPECUARIA",
    },
    {
      name: "Comercial Rural Tradição Ltda.",
      doc: "CNPJ 04.228.195/0001-62",
      city: "Cruz Alta/RS",
      type: "PJ",
      active: true,
      regime: "LEGADO",
      profile: "LOJA_AGROPECUARIA",
    },
    {
      name: "Antônio Carlos Silveira",
      doc: "CPF 318.***.***-02",
      city: "Alegrete/RS",
      type: "PF",
      active: true,
      regime: "NOVO",
      profile: "CREDENCIADO",
    },
    {
      name: "Paulo Renato Dornelles",
      doc: "CPF 701.***.***-44",
      city: "São Borja/RS",
      type: "PF",
      active: false,
      regime: "NOVO",
      profile: "CREDENCIADO",
    },
  ];
  const [selectedName, setSelectedName] = useState(holders[0].name);
  const visible = holders.filter((h) => natureza === "ALL" || h.type === natureza);
  const current = holders.find((h) => h.name === selectedName) ?? holders[0];
  function changeNatureza(next: "ALL" | "PJ" | "PF") {
    setNatureza(next);
    const first = holders.find((h) => next === "ALL" || h.type === next);
    if (first) setSelectedName(first.name);
  }
  return (
    <>
      <div className="segmented page-tabs">
        <button className={tab === "holders" ? "selected" : ""} onClick={() => setTab("holders")}>
          Estoquistas
        </button>
        <button className={tab === "profiles" ? "selected" : ""} onClick={() => setTab("profiles")}>
          Perfis e regras de fluxo
        </button>
      </div>
      {tab === "holders" ? (
      <div className="enable-layout">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Estoquistas habilitados</h2>
            <p>{holders.length} cadastros encontrados</p>
          </div>
          <button
            className="btn primary"
            onClick={() => {
              setEnableNatureza(natureza === "PF" ? "PF" : "PJ");
              setShowEnable(true);
            }}
          >
            <Icon name="plus" /> Habilitar estoquista
          </button>
        </div>
        <div className="filters">
          <div className="search-field">
            <Icon name="search" />
            <input placeholder="Buscar nome ou documento..." />
          </div>
          <div className="segmented">
            <button
              className={natureza === "ALL" ? "selected" : ""}
              onClick={() => changeNatureza("ALL")}
            >
              Todos
            </button>
            <button
              className={natureza === "PJ" ? "selected" : ""}
              onClick={() => changeNatureza("PJ")}
            >
              PJ · com atendentes
            </button>
            <button
              className={natureza === "PF" ? "selected" : ""}
              onClick={() => changeNatureza("PF")}
            >
              PF · sem atendentes
            </button>
          </div>
        </div>
        <div className="holder-list">
          {visible.map((h) => (
            <button
              key={h.name}
              className={current.name === h.name ? "selected" : ""}
              onClick={() => setSelectedName(h.name)}
            >
              <div className="company-icon">{h.type}</div>
              <div>
                <strong>{h.name}</strong>
                <span>
                  {h.doc} · {h.city}
                </span>
              </div>
              <div className="holder-tags">
                <Badge tone={h.regime === "NOVO" ? "blue" : "neutral"}>
                  {h.regime === "NOVO" ? "Regime NOVO" : "Legado · só leitura"}
                </Badge>
                <Badge tone={h.active ? "green" : "red"}>
                  {h.active ? "Habilitado" : "Suspenso"}
                </Badge>
              </div>
              <Icon name="chevron" size={15} />
            </button>
          ))}
          {visible.length === 0 && (
            <div className="producer-no-results">
              <strong>Nenhum estoquista nesta natureza</strong>
              <span>Ajuste o filtro ou habilite um novo.</span>
            </div>
          )}
        </div>
      </section>
      <aside className="panel attendant-panel">
        {current.type === "PJ" ? (
          <>
        <div className="panel-head">
          <div>
            <span className="eyebrow">
              PESSOA JURÍDICA SELECIONADA ·{" "}
              {current.regime === "NOVO" ? "REGIME NOVO" : "REGIME LEGADO"}
            </span>
            <h2>{current.name}</h2>
            <p>{current.doc}</p>
          </div>
          <Badge tone={current.regime === "NOVO" ? "blue" : "neutral"}>
            {current.regime === "NOVO" ? "Regime NOVO" : "Legado · só leitura"}
          </Badge>
        </div>
        <div className="attendant-title">
          <div>
            <strong>Atendentes</strong>
            <span>Usuários autorizados a operar em nome da loja</span>
          </div>
          <button
            className="btn secondary"
            disabled={current.regime === "LEGADO"}
            title={
              current.regime === "LEGADO"
                ? "Titular em regime LEGADO — gerencie no legado ou migre o estoquista para o regime NOVO"
                : ""
            }
            onClick={() => notify("Atendente habilitado e vinculado à pessoa jurídica.")}
          >
            <Icon name="plus" /> Habilitar atendente
          </button>
        </div>
        <div className="attendants">
          <article>
            <div className="initials">MO</div>
            <div>
              <strong>Mariana Teixeira Oliveira</strong>
              <span>CPF 023.***.***-90</span>
              <small>mariana.oliveira</small>
            </div>
            <Badge tone="green">Ativo</Badge>
          </article>
          <article>
            <div className="initials">LC</div>
            <div>
              <strong>Luiz Carlos Prestes</strong>
              <span>CPF 591.***.***-17</span>
              <small>luiz.prestes</small>
            </div>
            <Badge tone="green">Ativo</Badge>
          </article>
        </div>
        <div className="audit-note">
          <Icon name="history" />
          <span>Última atualização em 12/06/2025 por Fiscal SEAPI</span>
        </div>
          </>
        ) : (
          <>
        <div className="panel-head">
          <div>
            <span className="eyebrow">PESSOA FÍSICA SELECIONADA · REGIME {current.regime}</span>
            <h2>{current.name}</h2>
            <p>
              {current.doc} · {current.city}
            </p>
          </div>
          <Badge tone={current.active ? "green" : "red"}>
            {current.active ? "Habilitado" : "Suspenso"}
          </Badge>
        </div>
        <div className="attendant-title">
          <div>
            <strong>Estoquista pessoa física</strong>
            <span>Opera com o próprio usuário do sistema</span>
          </div>
        </div>
        <div className="audit-note">
          <Icon name="alert" />
          <span>
            PF não possui atendentes — a habilitação de atendentes existe apenas para PJ (loja). Ao
            selecionar uma PF, este painel mostra a ficha do estoquista em vez de atendentes.
          </span>
        </div>
        <div className="attendant-title">
          <div>
            <strong>Perfil de fluxo</strong>
            <span>{current.profile}</span>
          </div>
          <button
            className="btn secondary"
            onClick={() =>
              notify(
                current.active
                  ? `Estoquista suspenso com sucesso.`
                  : `Estoquista reativado com sucesso.`,
              )
            }
          >
            {current.active ? "Suspender estoquista" : "Reativar estoquista"}
          </button>
        </div>
          </>
        )}
      </aside>
      </div>
      ) : (
        <ProfilesPanel notify={notify} />
      )}
      {showEnable && (
        <ModalShell
          title="Habilitar estoquista"
          subtitle="Habilitação constitutiva do cadastro — sem etapa adicional de aprovação."
          onClose={() => setShowEnable(false)}
        >
          <div className="modal-body">
            <label className="scan-input compact">
              <span>PESSOA (BUSCA NA BASE DE CADASTRO)</span>
              <div>
                <Icon name="search" />
                <input placeholder="Nome, CPF ou CNPJ..." />
              </div>
            </label>
            <label className="scan-input compact">
              <span>NATUREZA</span>
              <select
                value={enableNatureza}
                onChange={(e) => setEnableNatureza(e.target.value as "PJ" | "PF")}
              >
                <option value="PJ">Pessoa jurídica (loja — com atendentes)</option>
                <option value="PF">Pessoa física (sem atendentes)</option>
              </select>
            </label>
            <label className="scan-input compact">
              <span>REGIME</span>
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value as "NOVO" | "LEGADO")}
              >
                <option value="NOVO">NOVO — movimenta neste sistema</option>
                <option value="LEGADO">LEGADO — movimenta no legado; o novo só consulta</option>
              </select>
            </label>
            <p className="modal-copy">
              Estoquistas em regime LEGADO aparecem nas telas deste sistema em modo somente leitura
              até migrarem (RN-013).
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setShowEnable(false)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setShowEnable(false);
                notify(`Estoquista habilitado — regime ${regime}.`);
              }}
            >
              Habilitar estoquista
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function ProfilesPanel({ notify }: { notify: (m: string) => void }) {
  const profiles = [
    { code: "LOJA_AGROPECUARIA", desc: "Loja agropecuária vendedora de brincos", holders: 2 },
    { code: "PREFEITURA", desc: "Estocador municipal", holders: 6 },
    { code: "COOPERATIVA_LEITE", desc: "Representante de cooperativa de leite", holders: 3 },
    { code: "CREDENCIADO", desc: "Credenciado SEAPI", holders: 1 },
    { code: "INSPETORIA", desc: "Inspetoria veterinária", holders: 1 },
    { code: "POSTO", desc: "Posto de defesa sanitária", holders: 1 },
    { code: "SEAPI", desc: "Estoque central da Secretaria", holders: 1 },
  ];
  const movements = ["Recebimento", "Venda", "Transferência", "Perda", "Saída interna"];
  const cycle = ["Livre", "Bloqueio", "Escopo: Mesmo município", "Escopo: Produtor"];
  const [rules, setRules] = useState<
    Record<string, Record<string, { origem: string; destino: string }>>
  >(() => {
    const base: Record<string, Record<string, { origem: string; destino: string }>> = {};
    for (const profile of profiles) {
      base[profile.code] = {};
      for (const movement of movements) {
        base[profile.code][movement] = { origem: "Livre", destino: "Livre" };
      }
    }
    base["PREFEITURA"]["Transferência"] = { origem: "Livre", destino: "Escopo: Mesmo município" };
    base["COOPERATIVA_LEITE"]["Transferência"] = {
      origem: "Livre",
      destino: "Escopo: Via integradora",
    };
    return base;
  });
  const [selected, setSelected] = useState("LOJA_AGROPECUARIA");
  function cycleCell(movement: string, side: "origem" | "destino") {
    setRules((current) => {
      const atual = current[selected][movement][side];
      const next = cycle[(cycle.indexOf(atual) + 1) % cycle.length];
      return {
        ...current,
        [selected]: {
          ...current[selected],
          [movement]: { ...current[selected][movement], [side]: next },
        },
      };
    });
  }
  function cellBadge(value: string) {
    if (value === "Livre") return <Badge tone="green">Livre</Badge>;
    if (value === "Bloqueio") return <Badge tone="red">Bloqueio</Badge>;
    return <Badge tone="yellow">{value}</Badge>;
  }
  const selectedProfile = profiles.find((p) => p.code === selected)!;
  return (
    <div className="enable-layout">
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Perfis de estocador</h2>
            <p>Tipos extensíveis por configuração — sem restrição registrada, o perfil opera livre.</p>
          </div>
          <button
            className="btn primary"
            onClick={() => notify("Perfil criado — disponível para habilitação de estoquistas.")}
          >
            <Icon name="plus" /> Novo perfil
          </button>
        </div>
        <div className="holder-list">
          {profiles.map((profile) => (
            <button
              key={profile.code}
              className={selected === profile.code ? "selected" : ""}
              onClick={() => setSelected(profile.code)}
            >
              <div className="company-icon">{profile.code.slice(0, 2)}</div>
              <div>
                <strong>{profile.code}</strong>
                <span>{profile.desc}</span>
              </div>
              <Badge tone="green">{profile.holders} estoquistas</Badge>
              <Icon name="chevron" size={15} />
            </button>
          ))}
        </div>
        <div className="audit-note">
          <Icon name="history" />
          <span>
            Inativação de perfil com estoquistas vinculados é bloqueada (ERR-043) — transfira-os
            para outro perfil antes.
          </span>
        </div>
      </section>
      <aside className="panel attendant-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">MATRIZ DE REGRAS DE FLUXO</span>
            <h2>{selected}</h2>
            <p>
              {selectedProfile.desc} · {selectedProfile.holders} estoquistas vinculados
            </p>
          </div>
          <button
            className="btn secondary"
            onClick={() =>
              notify(
                "Regras do perfil salvas — efeito prospectivo: movimentos já registrados não são revalidados.",
              )
            }
          >
            Salvar regras
          </button>
        </div>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Movimento</th>
                <th>Origem (de quem recebe)</th>
                <th>Destino (para quem envia)</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement}>
                  <td>
                    <strong>{movement}</strong>
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => cycleCell(movement, "origem")}>
                      {cellBadge(rules[selected][movement].origem)}
                    </button>
                  </td>
                  <td>
                    <button className="text-btn" onClick={() => cycleCell(movement, "destino")}>
                      {cellBadge(rules[selected][movement].destino)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="audit-note">
          <Icon name="alert" />
          <span>
            Clique em uma célula para alternar: Livre → Bloqueio → Escopo. Seed do legado:
            PREFEITURA transfere só a credenciados do município; COOPERATIVA_LEITE só a credenciados
            da integradora (CAND-MONO-601).
          </span>
        </div>
      </aside>
    </div>
  );
}

function NumberingPage({ notify, role }: { notify: (m: string) => void; role: Role }) {
  const [ranges, setRanges] = useState(numberingRanges);
  const [dialog, setDialog] = useState<"pnib" | "interna" | "distribute" | null>(null);
  const [internaTipo, setInternaTipo] = useState<"SISBOV" | "INTERNACIONAL">("SISBOV");
  const [internaQtd, setInternaQtd] = useState(1000);
  const [searchNum, setSearchNum] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("Todas as origens");
  const [filterTipo, setFilterTipo] = useState("Todos os tipos");
  const [filterSituacao, setFilterSituacao] = useState("Todas as situações");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const activeFilterCount = [
    filterOrigem !== "Todas as origens",
    filterTipo !== "Todos os tipos",
    filterSituacao !== "Todas as situações",
    searchNum.trim() !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearchNum("");
    setFilterOrigem("Todas as origens");
    setFilterTipo("Todos os tipos");
    setFilterSituacao("Todas as situações");
  }

  function gerarFaixaInterna() {
    const hoje = new Date().toLocaleDateString("pt-BR");
    // Deriva o próximo contador do tipo: pega o maior end existente
    const doTipo = ranges.filter((r) => r.tipo === internaTipo);
    const prefix = internaTipo === "SISBOV" ? "10543" : "07621";
    let nextStart = 0;
    if (doTipo.length > 0) {
      const maxEnd = Math.max(...doTipo.map((r) => parseInt(r.end.slice(-6), 10)));
      nextStart = maxEnd + 1;
    } else {
      nextStart = internaTipo === "SISBOV" ? 5001 : 241001;
    }
    const start = parseInt(prefix + "0057" + String(nextStart).padStart(6, "0"), 10);
    const end = start + internaQtd - 1;
    const nova = {
      start: String(start).padStart(15, "0"),
      end: String(end).padStart(15, "0"),
      qty: internaQtd,
      tipo: internaTipo,
      origem: "Interna",
      situacao: "Disponível",
      destino: null,
      dataCadastro: hoje,
      fonteInterna: true,
    };
    setRanges((prev) => [...prev, nova]);
    notify(`Faixa INTERNA gerada automaticamente pelo pool — ${internaQtd} brincos ${internaTipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"} (${formatTag(nova.start)} a ${formatTag(nova.end)}).`);
    setDialog(null);
  }

  const rows = ranges.filter((r) => {
    if (filterOrigem !== "Todas as origens" && r.origem !== filterOrigem) return false;
    if (filterTipo !== "Todos os tipos") {
      const filterVal = filterTipo === "Nacional · SISBOV" ? "SISBOV" : "INTERNACIONAL";
      if (r.tipo !== filterVal) return false;
    }
    if (filterSituacao !== "Todas as situações" && r.situacao !== filterSituacao) return false;
    if (searchNum.trim() !== "") {
      const q = searchNum.replace(/\D/g, "");
      if (q.length > 0) {
        if (!r.start.includes(q) && !r.end.includes(q)) return false;
      }
    }
    return true;
  }).sort((a, b) => {
    // dataCadastro no formato DD/MM/AAAA → ordenar decrescente (mais nova primeiro)
    const da = a.dataCadastro.split("/").reverse().join("");
    const db = b.dataCadastro.split("/").reverse().join("");
    return db.localeCompare(da);
  });
  return (
    <div className="page-container">
      <section className="header">
        <h3>Faixas de numeração</h3>
        <div className="header-actions">
          <Link className="text-btn muted-action chart-btn" to={`/${role}/numeracao/dashboard`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
            </svg>
            Dashboard
          </Link>
          <button className="btn primary" onClick={() => setDialog("pnib")}>
            <Icon name="request" /> Solicitar ao PNIB
          </button>
          <button className="btn primary" onClick={() => { setDialog("interna"); }}>
            <Icon name="hash" /> Gerar faixa interna
          </button>
          <div className="layout-toggle">
            <button className={`layout-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`layout-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <form className="filters-card" onSubmit={(e) => e.preventDefault()}>
        <div className="filters-header">
          <button type="button" className="filters-toggle" onClick={() => setFiltersExpanded((v) => !v)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d={filtersExpanded ? "M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" : "M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"}/>
            </svg>
            <span className="filters-title">Filtros</span>
            {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
          </button>
          <div className="filters-header-actions">
            <button type="button" className="btn-search" onClick={() => {}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Pesquisar
            </button>
            <button type="button" className="btn-clear" onClick={clearFilters}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Limpar
            </button>
          </div>
        </div>
        {filtersExpanded && (
          <div className="filters-body">
            <div className="filter-row filter-row--full">
              <div className="search-field filter-field">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input placeholder="Buscar por código de barras (15 dígitos)..." value={searchNum} onChange={(e) => setSearchNum(e.target.value)} />
              </div>
            </div>
            <div className="filter-row">
              <select className="filter-field" value={filterOrigem} onChange={(e) => setFilterOrigem(e.target.value)}>
                <option>Todas as origens</option>
                <option>PNIB</option>
                <option>Interna</option>
              </select>
              <select className="filter-field" value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
                <option>Todos os tipos</option>
                <option>Nacional · SISBOV</option>
                <option>Internacional</option>
              </select>
              <select className="filter-field" value={filterSituacao} onChange={(e) => setFilterSituacao(e.target.value)}>
                <option>Todas as situações</option>
                <option>Disponível</option>
                <option>Distribuída</option>
              </select>
            </div>
          </div>
        )}
      </form>

      {viewMode === "list" ? (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Intervalo</th>
                <th>Quantidade</th>
                <th>Tipo</th>
                <th>Origem</th>
                <th>Situação</th>
                <th>Destinação</th>
                <th className="th-actions">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.start}>
                  <td className="range-cell">
                    <strong>{formatTag(r.start)}</strong>
                    <span>até {formatTag(r.end)}</span>
                  </td>
                  <td>{r.qty.toLocaleString("pt-BR")}</td>
                  <td>
                    <Badge tone={r.tipo === "SISBOV" ? "green" : "purple"}>
                      {r.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={r.origem === "PNIB" ? "blue" : "purple"}>{r.origem}</Badge>
                  </td>
                  <td>
                    <Badge tone={r.situacao === "Disponível" ? "green" : "yellow"}>{r.situacao}</Badge>
                  </td>
                  <td>{r.destino ?? "—"}</td>
                  <td className="td-actions">
                    <div className="action-cell">
                      {r.situacao === "Disponível" ? (
                        <button className="text-btn" onClick={() => setDialog("distribute")}>
                          Distribuir
                        </button>
                      ) : null}
                      <Link className="text-btn" to={`/${role}/numeracao/${r.start}`}>
                        Detalhes
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid-cards">
          {rows.map((r) => (
            <div key={r.start} className="grid-card">
              <div className="grid-card-accent" style={{ background: r.origem === "PNIB" ? "linear-gradient(90deg, #2196f3, #64b5f6)" : "linear-gradient(90deg, #9c27b0, #ce93d8)" }}></div>
              <div className="grid-card-body">
                <div className="grid-card-header">
                  <span className="categoria-badge" style={{ background: r.tipo === "SISBOV" ? "#e8f5e9" : "#f3e5f5", color: r.tipo === "SISBOV" ? "#2e7d32" : "#7b1fa2" }}>
                    {r.tipo === "SISBOV" ? "NACIONAL · SISBOV" : "INTERNACIONAL"}
                  </span>
                  <Link className="grid-card-btn" to={`/${role}/numeracao/${r.start}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                  </Link>
                </div>
                <div className="grid-card-title">{formatTag(r.start)}</div>
                <div className="grid-card-date">até {formatTag(r.end)} · {r.qty.toLocaleString("pt-BR")} brincos</div>
                <div className="grid-card-divider"></div>
                <div className="grid-card-info">
                  <div className="grid-card-info-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span>Origem: <strong>{r.origem}</strong></span>
                  </div>
                  <div className="grid-card-info-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    <span>Cadastro: <strong>{r.dataCadastro}</strong></span>
                  </div>
                  <div className="grid-card-info-row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>Destino: <strong>{r.destino ?? "—"}</strong></span>
                  </div>
                </div>
                <div className="grid-card-footer">
                  <div className="grid-card-tag">
                    <span className="tag-label">Situação</span>
                    <span className="tag-value" style={r.situacao === "Disponível" ? { color: "#2e7d32" } : { color: "#e65100" }}>{r.situacao}</span>
                  </div>
                  {r.situacao === "Disponível" ? (
                    <div className="grid-card-tag grid-card-tag--num">
                      <button className="text-btn" onClick={() => setDialog("distribute")}>
                        Distribuir
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="stats-grid numbering-stats" style={{ marginTop: 24 }}>
        <article className="stat">
          <div className="stat-icon blue">
            <Icon name="hash" />
          </div>
          <div>
            <span>Total autorizado</span>
            <strong>26.000</strong>
            <small>numerações</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon green">
            <Icon name="check" />
          </div>
          <div>
            <span>Disponíveis</span>
            <strong>11.000</strong>
            <small>numerações</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon yellow">
            <Icon name="factory" />
          </div>
          <div>
            <span>Distribuídas</span>
            <strong>15.000</strong>
            <small>numerações</small>
          </div>
        </article>
      </div>
      {dialog === "pnib" && (
        <ModalShell
          title="Solicitar faixas ao PNIB"
          subtitle="A operação ficará registrada na trilha de auditoria."
          onClose={() => setDialog(null)}
        >
          <div className="modal-body form-grid">
            <label>
              <span>Quantidade</span>
              <input type="number" defaultValue="10000" />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setDialog(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setDialog(null);
                notify("Solicitação ao PNIB registrada com sucesso.");
              }}
            >
              Confirmar
            </button>
          </div>
        </ModalShell>
      )}
      {dialog === "interna" && (
        <ModalShell
          title="Gerar faixa interna"
          subtitle="O sistema aloca o próximo intervalo livre do pool sequencial — sem digitação de números (RN-008)."
          onClose={() => setDialog(null)}
        >
          <div className="modal-body form-grid">
            <label>
              <span>TIPO DO BRINCO</span>
              <select
                value={internaTipo}
                onChange={(e) => setInternaTipo(e.target.value as "SISBOV" | "INTERNACIONAL")}
              >
                <option value="SISBOV">Nacional · SISBOV (105)</option>
                <option value="INTERNACIONAL">Internacional (076)</option>
              </select>
            </label>
            <label>
              <span>QUANTIDADE</span>
              <input
                type="number"
                min={1}
                max={50000}
                value={internaQtd}
                onChange={(e) => setInternaQtd(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setDialog(null)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={gerarFaixaInterna}>
              Gerar faixa do pool
            </button>
          </div>
        </ModalShell>
      )}
      {dialog === "distribute" && (
        <ModalShell
          title="Distribuir faixa"
          subtitle="A operação ficará registrada na trilha de auditoria."
          onClose={() => setDialog(null)}
        >
          <div className="modal-body form-grid">
            <label className="wide">
              <span>Destino</span>
              <select>
                <option>Identifica Brasil S.A. — Fábrica</option>
                <option>Brinco Sul Indústria — Fábrica</option>
                <option>Depósito central SEAPI — Estoque</option>
              </select>
            </label>
            <label className="wide">
              <span>Observação</span>
              <textarea placeholder="Informação complementar (opcional)" />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setDialog(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setDialog(null);
                notify("Faixa distribuída ao destinatário.");
              }}
            >
              Confirmar operação
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// ==== Dashboard de numeração — dados demonstrativos (não produção) ====
const fmtBR = (n: number) => n.toLocaleString("pt-BR");

const numberingDemo = {
  months: ["jan", "fev", "mar", "abr", "mai", "jun"],
  monthsFull: ["01/2025", "02/2025", "03/2025", "04/2025", "05/2025", "06/2025"],
  periodos: [
    { id: "tudo", label: "Todo período", from: 0, to: 5 },
    { id: "3m", label: "Últimos 3 meses", from: 3, to: 5 },
    { id: "2m", label: "Últimos 2 meses", from: 4, to: 5 },
    { id: "custom", label: "Personalizado", from: -1, to: -1 },
  ],
  tipos: [
    { id: "TODOS", label: "Todos" },
    { id: "INTERNACIONAL", label: "Internacional" },
    { id: "SISBOV", label: "Nacional · SISBOV" },
  ],
  origens: [
    { id: "TODAS", label: "Todas" },
    { id: "PNIB", label: "PNIB" },
    { id: "interna", label: "Interna SDA" },
  ],
  tipoLabels: { INTERNACIONAL: "Internacional", SISBOV: "Nacional · SISBOV" },
  celulas: {
    INTERNACIONAL: {
      PNIB: {
        saidas: [800, 800, 600, 600, 600, 600],
        saldo: [2200, 1400, 800, 3200, 2600, 2000],
        entradasPnib: [3000, 0, 0, 3000, 0, 0],
        entradasInterna: [0, 0, 0, 0, 0, 0],
        aging: [1200, 500, 300],
      },
      interna: {
        saidas: [0, 0, 600, 600, 900, 900],
        saldo: [1000, 1000, 1400, 800, 900, 2000],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [1000, 0, 1000, 0, 1000, 2000],
        aging: [1500, 500, 0],
      },
    },
    SISBOV: {
      PNIB: {
        saidas: [0, 0, 0, 0, 0, 0],
        saldo: [0, 0, 0, 0, 0, 0],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [0, 0, 0, 0, 0, 0],
        aging: [0, 0, 0],
      },
      interna: {
        saidas: [400, 1000, 1200, 1800, 2100, 1500],
        saldo: [2600, 3600, 4400, 5600, 6500, 7000],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [3000, 2000, 2000, 3000, 3000, 2000],
        aging: [4000, 2000, 1000],
      },
    },
  },
  destinatarios: [
    { nome: "Brinco Sul Indústria", value: 8000, tipo: "SISBOV", origem: "interna" },
    { nome: "Identifica Brasil S.A.", value: 4000, tipo: "INTERNACIONAL", origem: "PNIB" },
    { nome: "Pecúnia Etiquetas Ltda.", value: 3000, tipo: "INTERNACIONAL", origem: "interna" },
  ],
  leadTimePnib: [
    { id: "SOL-2025-01", autorizacao: 16, entrega: 23 },
    { id: "SOL-2025-02", autorizacao: 18, entrega: 23 },
    { id: "SOL-2025-03", autorizacao: 18, entrega: 23 },
  ],
  criadores: [
    { nome: "Geração automática — interna", modo: "auto", origem: "interna", porTipo: { INTERNACIONAL: 2000, SISBOV: 6000 }, serie: [2000, 1000, 1500, 1000, 1500, 1000], color: "#0e8a6d" },
    { nome: "Geração automática — PNIB", modo: "auto", origem: "PNIB", porTipo: { INTERNACIONAL: 6000, SISBOV: 0 }, serie: [3000, 0, 0, 3000, 0, 0], color: "#1565c0" },
    { nome: "Juliana P. Rocha — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 3000, SISBOV: 2000 }, serie: [500, 500, 500, 1000, 500, 2000], color: "#96d18a" },
    { nome: "Ana R. Farias — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 0, SISBOV: 4000 }, serie: [1000, 500, 500, 500, 1000, 500], color: "#4BA044" },
    { nome: "Carlos M. Duarte — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 0, SISBOV: 3000 }, serie: [500, 0, 500, 500, 1000, 500], color: "#6fbc5e" },
  ],
};

const zero6 = () => [0, 0, 0, 0, 0, 0];
const AGING_LABELS = ["0–30 dias", "31–60 dias", "60+ dias"];
const AGING_COLORS = ["#4BA044", "#d99a3b", "#d64545"];

const somarSeries = (
  lista: { saidas: number[]; saldo: number[]; entradasPnib: number[]; entradasInterna: number[] }[]
) =>
  lista.reduce(
    (acc, c) => ({
      saidas: acc.saidas.map((v, i) => v + c.saidas[i]),
      saldo: acc.saldo.map((v, i) => v + c.saldo[i]),
      entradasPnib: acc.entradasPnib.map((v, i) => v + c.entradasPnib[i]),
      entradasInterna: acc.entradasInterna.map((v, i) => v + c.entradasInterna[i]),
    }),
    { saidas: zero6(), saldo: zero6(), entradasPnib: zero6(), entradasInterna: zero6() }
  );

function SaldoLineChart({ data, months }: { data: number[]; months: string[] }) {
  const W = 720, H = 260;
  const P = { t: 18, r: 16, b: 34, l: 48 };
  const yMax = 20000, step = 5000;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const x = (i: number) => P.l + (iw * i) / (data.length - 1);
  const y = (v: number) => P.t + ih - (ih * v) / yMax;
  const pts = data.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  const area = `${P.l},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução do saldo disponível">
        {[0, step, step * 2, step * 3, step * 4].map((v) => (
          <Fragment key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#eef2ee" strokeWidth={1} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
              {v === 0 ? "0" : `${v / 1000} mil`}
            </text>
          </Fragment>
        ))}
        <polygon points={area} fill="rgba(75, 160, 68, 0.12)" />
        <polyline points={pts} fill="none" stroke="#4BA044" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {data.map((v, i) => (
          <Fragment key={i}>
            <circle cx={x(i)} cy={y(v)} r={4} fill="#4BA044" stroke="#fff" strokeWidth={1.5} />
            <text x={x(i)} y={y(v) - 10} textAnchor="middle" fontSize={11} fontWeight={600} fill="#4b5563">
              {fmtBR(v)}
            </text>
            <text x={x(i)} y={H - 12} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {months[i]}
            </text>
          </Fragment>
        ))}
      </svg>
    </div>
  );
}

function ConsumoBarChart({ data, months }: { data: number[]; months: string[] }) {
  const W = 460, H = 230;
  const P = { t: 20, r: 12, b: 30, l: 44 };
  const yMax = 4000, step = 1000;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const y = (v: number) => P.t + ih - (ih * v) / yMax;
  const slot = iw / data.length;
  const barW = slot * 0.52;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Numerações distribuídas por mês">
        {[0, step, step * 2, step * 3, step * 4].map((v) => (
          <Fragment key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#eef2ee" strokeWidth={1} />
            <text x={P.l - 8} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="#9ca3af">
              {v === 0 ? "0" : `${v / 1000} mil`}
            </text>
          </Fragment>
        ))}
        {data.map((v, i) => {
          const bx = P.l + slot * i + (slot - barW) / 2;
          return (
            <Fragment key={i}>
              <rect x={bx} y={y(v)} width={barW} height={y(0) - y(v)} rx={4} fill="#d99a3b" />
              <text x={bx + barW / 2} y={y(v) - 6} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#4b5563">
                {fmtBR(v)}
              </text>
              <text x={P.l + slot * i + slot / 2} y={H - 10} textAnchor="middle" fontSize={10.5} fill="#9ca3af">
                {months[i]}
              </text>
            </Fragment>
          );
        })}
      </svg>
    </div>
  );
}

function OrigemStackedChart({ pnib, interna, months }: { pnib: number[]; interna: number[]; months: string[] }) {
  const W = 460, H = 230;
  const P = { t: 20, r: 12, b: 30, l: 44 };
  const yMax = 12000;
  const iw = W - P.l - P.r, ih = H - P.t - P.b;
  const y0 = P.t + ih;
  const h = (v: number) => (ih * v) / yMax;
  const slot = iw / months.length;
  const barW = slot * 0.52;
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Novas faixas por origem e mês">
        <line x1={P.l} x2={W - P.r} y1={y0} y2={y0} stroke="#e2e8e3" strokeWidth={1} />
        {months.map((m, i) => {
          const ph = h(pnib[i]), nh = h(interna[i]);
          const bx = P.l + slot * i + (slot - barW) / 2;
          const total = pnib[i] + interna[i];
          return (
            <Fragment key={i}>
              {pnib[i] > 0 && <rect x={bx} y={y0 - ph} width={barW} height={ph} rx={2} fill="#1565c0" />}
              {interna[i] > 0 && <rect x={bx} y={y0 - ph - nh} width={barW} height={nh} rx={2} fill="#e65100" />}
              {total === 0 && <rect x={bx} y={y0 - 2} width={barW} height={2} rx={1} fill="#e5e7eb" />}
              {total > 0 && (
                <text x={bx + barW / 2} y={y0 - ph - nh - 6} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="#4b5563">
                  {fmtBR(total)}
                </text>
              )}
              <text x={P.l + slot * i + slot / 2} y={H - 10} textAnchor="middle" fontSize={10.5} fill="#9ca3af">
                {m}
              </text>
            </Fragment>
          );
        })}
      </svg>
    </div>
  );
}

function SituacaoDonut({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((a, b) => a + b.value, 0);
  const R = 80, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="donut-flex">
      <svg viewBox="0 0 200 200" role="img" aria-label="Distribuição por situação">
        <circle cx={100} cy={100} r={R} fill="none" stroke="#eef2ee" strokeWidth={26} />
        {total > 0 &&
          items.map((it) => {
            const len = (C * it.value) / total;
            const seg = (
              <circle
                key={it.label}
                cx={100} cy={100} r={R} fill="none"
                stroke={it.color} strokeWidth={26}
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-acc}
                transform="rotate(-90 100 100)"
              />
            );
            acc += len;
            return seg;
          })}
        <text x={100} y={97} textAnchor="middle" fontSize={24} fontWeight={700} fill="#314138">
          {fmtBR(total)}
        </text>
        <text x={100} y={116} textAnchor="middle" fontSize={11} fill="#9ca3af">
          numerações
        </text>
      </svg>
      <div className="donut-legend">
        {items.map((it) => (
          <div className="donut-legend-item" key={it.label}>
            <span className="dot" style={{ background: it.color }} />
            <span className="donut-label">{it.label}</span>
            <b>{fmtBR(it.value)}</b>
            <small>{total > 0 ? Math.round((it.value / total) * 100) : 0}%</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadTimeChart({ items }: { items: { id: string; autorizacao: number; entrega: number }[] }) {
  const maxTotal = Math.max(...items.map((it) => it.autorizacao + it.entrega));
  return (
    <div className="hbar-list">
      {items.map((it) => {
        const total = it.autorizacao + it.entrega;
        return (
          <div className="lt-row" key={it.id}>
            <div className="lt-head">
              <span className="lt-id">{it.id}</span>
              <b className="lt-total">{total} dias</b>
            </div>
            <div className="lt-track">
              <span className="lt-seg auth" style={{ width: `${(it.autorizacao / maxTotal) * 100}%` }} />
              <span className="lt-seg deliv" style={{ width: `${(it.entrega / maxTotal) * 100}%` }} />
            </div>
            <div className="lt-meta">
              autorização {it.autorizacao} d · fabricação + entrega {it.entrega} d
            </div>
          </div>
        );
      })}
      <div className="chart-legend" style={{ padding: 0 }}>
        <span><span className="dot" style={{ background: "#1565c0" }} />Autorização PNIB</span>
        <span><span className="dot" style={{ background: "#4BA044" }} />Fabricação + entrega</span>
      </div>
    </div>
  );
}

function TipoProjection({ items }: { items: { tipo: string; saldo: number; media: number }[] }) {
  return (
    <div className="tipo-grid">
      {items.map((it) => {
        const dias = it.media > 0 ? Math.round((it.saldo / it.media) * 30) : null;
        const status =
          dias === null ? "neutral" : dias > 90 ? "ok" : dias >= 45 ? "warn" : "danger";
        const label =
          dias === null
            ? "Sem consumo no período"
            : status === "ok"
              ? "Saudável"
              : status === "warn"
                ? "Atenção"
                : "Crítico";
        const pct = dias === null ? 0 : Math.min(100, Math.round((dias / 180) * 100));
        return (
          <div className={`tipo-card ${status}`} key={it.tipo}>
            <div className="tipo-name">{it.tipo}</div>
            <div className="tipo-days">
              {dias === null ? "—" : dias} <small>{dias === null ? "" : "dias"}</small>
            </div>
            <div className="tipo-meta">
              saldo {fmtBR(it.saldo)} · consumo {fmtBR(it.media)}/mês
            </div>
            <div className="proj-track">
              <span className="proj-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="tipo-pill">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AgingChart({ buckets }: { buckets: { label: string; value: number; color: string }[] }) {
  const total = buckets.reduce((a, b) => a + b.value, 0);
  const max = Math.max(...buckets.map((b) => b.value));
  return (
    <div className="hbar-list">
      {buckets.map((b) => (
        <div className="hbar-row wide-val" key={b.label}>
          <span className="hbar-name">{b.label}</span>
          <div className="hbar-track">
            <span
              className="hbar-fill"
              style={{ width: `${max > 0 ? Math.round((b.value / max) * 100) : 0}%`, background: b.color }}
            />
          </div>
          <span className="hbar-value">
            {fmtBR(b.value)} · {total > 0 ? Math.round((b.value / total) * 100) : 0}%
          </span>
        </div>
      ))}
      <p className="aging-note">
        Faixas autorizadas e ainda disponíveis, por tempo desde o cadastro
        (base 30/06/2025). Barra 60+ crescendo indica superautorização.
      </p>
    </div>
  );
}

function NumberingDashboard({ role }: { role: Role }) {
  const [range, setRange] = useState({ from: 3, to: 5 });
  const [customAberto, setCustomAberto] = useState(false);
  const [tipo, setTipo] = useState<"TODOS" | "INTERNACIONAL" | "SISBOV">("TODOS");
  const [origem, setOrigem] = useState<"TODAS" | "PNIB" | "interna">("TODAS");
  const [criador, setCriador] = useState("TODOS");

  const nMeses = range.to - range.from + 1;
  const celulasSelecionadas = (["INTERNACIONAL", "SISBOV"] as const)
    .filter((t) => tipo === "TODOS" || tipo === t)
    .flatMap((t) =>
      (["PNIB", "interna"] as const)
        .filter((o) => origem === "TODAS" || origem === o)
        .map((o) => numberingDemo.celulas[t][o])
    );
  const serie = somarSeries(celulasSelecionadas);
  const cut = (arr: number[]) => arr.slice(range.from, range.to + 1);
  const monthsV = numberingDemo.months.slice(range.from, range.to + 1);
  const saidasV = cut(serie.saidas);
  const saldoV = cut(serie.saldo);
  const saldoAtual = saldoV[saldoV.length - 1];
  const mediaPeriodo = Math.round(saidasV.reduce((a, b) => a + b, 0) / saidasV.length);
  const semConsumo = mediaPeriodo === 0;
  const totalAutorizado =
    serie.entradasPnib.reduce((a, b) => a + b, 0) +
    serie.entradasInterna.reduce((a, b) => a + b, 0);
  const totalDistribuido = serie.saidas.reduce((a, b) => a + b, 0);

  const dias = semConsumo ? 0 : Math.round((saldoAtual / mediaPeriodo) * 30);
  const esgotamento = new Date(2025, 5, 30);
  esgotamento.setDate(esgotamento.getDate() + dias);
  const leadMedio = Math.round(
    numberingDemo.leadTimePnib.reduce((a, it) => a + it.autorizacao + it.entrega, 0) /
      numberingDemo.leadTimePnib.length
  );
  const mostraLead = origem !== "interna" && tipo !== "SISBOV";
  const leadEfetivo = mostraLead ? leadMedio : 0;
  const coberturaLiquida = dias - leadEfetivo;
  const status = coberturaLiquida > 90 ? "ok" : coberturaLiquida >= 45 ? "warn" : "danger";
  const statusLabel =
    status === "ok" ? "Ritmo saudável" : status === "warn" ? "Atenção" : "Risco de ruptura";
  const pctBar = Math.min(100, Math.round((coberturaLiquida / 180) * 100));
  const situacao = [
    { label: "Disponível", value: saldoAtual, color: "#4BA044" },
    { label: "Distribuída", value: totalDistribuido, color: "#d99a3b" },
  ];

  const criadorSel = criador === "TODOS" ? null : numberingDemo.criadores.find((c) => c.nome === criador) ?? null;
  const criadorCompativel = !criadorSel || origem === "TODAS" || origem === criadorSel.origem;

  const criadoresFiltrados = numberingDemo.criadores
    .filter((c) => (origem === "TODAS" || c.origem === origem) && (!criadorSel || c.nome === criadorSel.nome))
    .map((c) => ({
      ...c,
      value: tipo === "TODOS" ? c.porTipo.INTERNACIONAL + c.porTipo.SISBOV : c.porTipo[tipo],
    }))
    .filter((c) => c.value > 0);
  const totalCriado = criadoresFiltrados.reduce((a, c) => a + c.value, 0);
  const criadoPnib = criadoresFiltrados
    .filter((c) => c.origem === "PNIB")
    .reduce((a, c) => a + c.value, 0);
  const criadoInterna = totalCriado - criadoPnib;
  const autoPnib = criadoresFiltrados
    .filter((c) => c.modo === "auto" && c.origem === "PNIB")
    .reduce((a, c) => a + c.value, 0);
  const autoInterna = criadoresFiltrados
    .filter((c) => c.modo === "auto" && c.origem === "interna")
    .reduce((a, c) => a + c.value, 0);
  const autoTotal = autoPnib + autoInterna;
  const manualTotal = totalCriado - autoTotal;
  const maxCriador = criadoresFiltrados.length
    ? Math.max(...criadoresFiltrados.map((c) => c.value))
    : 0;
  const notaPartes: string[] = [];
  if (autoTotal > 0) {
    const detalheAuto =
      autoPnib > 0 && autoInterna > 0
        ? `PNIB ${fmtBR(autoPnib)} · interna ${fmtBR(autoInterna)}`
        : autoPnib > 0
          ? "faixas PNIB"
          : "faixas internas";
    notaPartes.push(
      `${fmtBR(autoTotal)} por geração automática (${detalheAuto}, conforme config SEAPI)`
    );
  }
  if (manualTotal > 0) {
    notaPartes.push(`${fmtBR(manualTotal)} manualmente por analistas da SEAPI`);
  }

  const destFiltrados = numberingDemo.destinatarios.filter(
    (d) => (tipo === "TODOS" || d.tipo === tipo) && (origem === "TODAS" || d.origem === origem)
  );
  const maxDest = destFiltrados.length ? Math.max(...destFiltrados.map((d) => d.value)) : 0;

  const agingBuckets = AGING_LABELS.map((label, i) => ({
    label,
    value: celulasSelecionadas.reduce((a, c) => a + c.aging[i], 0),
    color: AGING_COLORS[i],
  }));

  const zeroV = monthsV.map(() => 0);
  const pnibV = criadorSel
    ? criadorSel.origem === "PNIB" && criadorCompativel
      ? cut(criadorSel.serie)
      : zeroV
    : origem === "interna"
      ? zeroV
      : cut(serie.entradasPnib);
  const internaV = criadorSel
    ? criadorSel.origem === "interna" && criadorCompativel
      ? cut(criadorSel.serie)
      : zeroV
    : origem === "PNIB"
      ? zeroV
      : cut(serie.entradasInterna);

  const tipoCards = (["INTERNACIONAL", "SISBOV"] as const)
    .filter((t) => tipo === "TODOS" || tipo === t)
    .map((t) => {
      const sel = (["PNIB", "interna"] as const)
        .filter((o) => origem === "TODAS" || origem === o)
        .map((o) => numberingDemo.celulas[t][o]);
      const saidasTipo = sel.reduce((acc, c) => acc.map((v, i) => v + c.saidas[i]), zero6());
      const saldoFinal = sel.reduce((a, c) => a + c.saldo[c.saldo.length - 1], 0);
      const media = Math.round(
        saidasTipo.slice(range.from, range.to + 1).reduce((a, b) => a + b, 0) / nMeses
      );
      return { tipo: numberingDemo.tipoLabels[t], saldo: saldoFinal, media };
    });

  const tipoSuffix = tipo === "TODOS" ? "" : ` · ${numberingDemo.tipoLabels[tipo]}`;

  return (
    <div className="page-container">
      <section className="header">
        <h3>Dashboard de numeração</h3>
        <div className="header-actions">
          <Link className="btn secondary" to={`/${role}/numeracao`}>
            ← Voltar
          </Link>
        </div>
      </section>

      <div className="dash-note">
        Dados demonstrativos para validação de layout — não refletem números de
        produção. A projeção usa a média de distribuição do período filtrado
        ({nMeses} {nMeses === 1 ? "mês" : "meses"}).
      </div>

      <div className="dash-filters">
        <div className="filter-group">
          <span className="filter-label">Período</span>
          <div className="chip-set">
            {numberingDemo.periodos.map((p) => {
              const isCustom = p.id === "custom";
              const presetAtivo =
                !isCustom && range.from === p.from && range.to === p.to && !customAberto;
              const active = isCustom
                ? customAberto ||
                  !numberingDemo.periodos.some(
                    (q) => q.id !== "custom" && range.from === q.from && range.to === q.to
                  )
                : presetAtivo;
              return (
                <button
                  key={p.id}
                  className={`chip ${active ? "active" : ""}`}
                  onClick={() => {
                    if (isCustom) {
                      setCustomAberto(true);
                    } else {
                      setRange({ from: p.from, to: p.to });
                      setCustomAberto(false);
                    }
                  }}
                >
                  {p.label}
                </button>
              );
            })}
            {customAberto && (
              <div className="custom-range">
                <label>
                  De
                  <select
                    value={range.from}
                    onChange={(e) => {
                      const f = Number(e.target.value);
                      setRange({ from: f, to: Math.max(f, range.to) });
                    }}
                  >
                    {numberingDemo.monthsFull.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Até
                  <select
                    value={range.to}
                    onChange={(e) => {
                      const t = Number(e.target.value);
                      setRange({ from: Math.min(range.from, t), to: t });
                    }}
                  >
                    {numberingDemo.monthsFull.map((m, i) => (
                      <option key={m} value={i}>{m}</option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Tipo</span>
          <div className="chip-set">
            {numberingDemo.tipos.map((t) => (
              <button
                key={t.id}
                className={`chip ${tipo === t.id ? "active" : ""}`}
                onClick={() => setTipo(t.id as typeof tipo)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Origem</span>
          <div className="chip-set">
            {numberingDemo.origens.map((o) => (
              <button
                key={o.id}
                className={`chip ${origem === o.id ? "active" : ""}`}
                onClick={() => setOrigem(o.id as typeof origem)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Criador</span>
          <select
            className={`filter-select ${criador !== "TODOS" ? "ativo" : ""}`}
            value={criador}
            onChange={(e) => setCriador(e.target.value)}
          >
            <option value="TODOS">Todos os criadores</option>
            {[...numberingDemo.criadores]
              .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))
              .map((c) => (
                <option key={c.nome} value={c.nome}>{c.nome}</option>
              ))}
          </select>
        </div>
      </div>

      <div className="stats-grid numbering-stats">
        <article className="stat">
          <div className="stat-icon blue">
            <Icon name="hash" />
          </div>
          <div>
            <span>Total autorizado</span>
            <strong>{fmtBR(totalAutorizado)}</strong>
            <small>numerações</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon green">
            <Icon name="check" />
          </div>
          <div>
            <span>Disponíveis</span>
            <strong>{fmtBR(saldoAtual)}</strong>
            <small>numerações</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon yellow">
            <Icon name="factory" />
          </div>
          <div>
            <span>Distribuídas</span>
            <strong>{fmtBR(totalDistribuido)}</strong>
            <small>numerações</small>
          </div>
        </article>
      </div>

      <div className="dash-grid">
        <article className={`proj-card ${status === "ok" ? "" : status}`}>
          <div className="proj-head">
            <h2>Projeção de esgotamento</h2>
            <span className="proj-pill">{semConsumo ? "Sem distribuições" : statusLabel}</span>
          </div>
          {semConsumo ? (
            <>
              <div className="proj-value">—</div>
              <div className="proj-sub">
                Sem distribuições no período filtrado — projeção indisponível
                para a seleção atual.
              </div>
              <div className="proj-track">
                <span className="proj-fill" style={{ width: "0%" }} />
              </div>
              <div className="proj-meta">
                Ajuste os filtros para recalcular a projeção.
              </div>
            </>
          ) : (
            <>
              <div className="proj-value">
                ≈ {dias} <small>dias</small>
              </div>
              <div className="proj-sub">
                até esgotar as {fmtBR(saldoAtual)} numerações disponíveis
                (estimativa {esgotamento.toLocaleDateString("pt-BR")}).
              </div>
              <div className="proj-sub">
                Cobertura líquida: <b>{coberturaLiquida} dias</b>
                {mostraLead
                  ? `, já descontado o lead time médio de reposição (${leadMedio} dias) — critério do status.`
                  : " (sem lead time de reposição PNIB aplicável ao filtro) — critério do status."}
              </div>
              <div className="proj-track">
                <span className="proj-fill" style={{ width: `${pctBar}%` }} />
              </div>
              <div className="proj-meta">
                Média do período filtrado: {fmtBR(mediaPeriodo)} numerações/mês ·{" "}
                {mostraLead
                  ? `lead time médio PNIB: ${leadMedio} dias`
                  : "faixas internas — sem lead time PNIB"}{" "}
                · horizonte de 180 dias
              </div>
            </>
          )}
        </article>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Distribuição por situação</h2>
              <p>Disponível vs distribuída no estoque atual</p>
            </div>
          </div>
          <SituacaoDonut items={situacao} />
        </section>
      </div>

      <section className="panel dash-mt">
        <div className="panel-head">
          <div>
            <h2>Evolução do saldo disponível</h2>
            <p>Saldo de numerações não distribuídas por mês{tipoSuffix}</p>
          </div>
        </div>
        <SaldoLineChart data={saldoV} months={monthsV} />
      </section>

      <div className="dash-grid dash-mt">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Consumo por período</h2>
              <p>Numerações distribuídas por mês{tipoSuffix}</p>
            </div>
          </div>
          <ConsumoBarChart data={saidasV} months={monthsV} />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>{criadorSel ? "Criações por mês" : "Origem por mês"}</h2>
              <p>
                {criadorSel
                  ? `Criações de ${criadorSel.nome}${criadorCompativel ? "" : " — sem criações na origem filtrada"}`
                  : `Novas faixas: PNIB vs interna${tipoSuffix}`}
              </p>
            </div>
          </div>
          <OrigemStackedChart pnib={pnibV} interna={internaV} months={monthsV} />
          <div className="chart-legend">
            {pnibV.some((v) => v > 0) && (
              <span><span className="dot" style={{ background: "#1565c0" }} />{criadorSel ? "Criações" : "PNIB"}</span>
            )}
            {internaV.some((v) => v > 0) && (
              <span><span className="dot" style={{ background: "#e65100" }} />{criadorSel ? "Criações" : "Interna SDA"}</span>
            )}
          </div>
        </section>
      </div>

      <section className="panel dash-mt">
        <div className="panel-head">
          <div>
            <h2>Numerações criadas — por criador</h2>
            <p>Faixas criadas por geração automática (PNIB ou interna, conforme config SEAPI) ou manualmente por analistas</p>
          </div>
          <span className="head-badge">{fmtBR(totalCriado)} numerações</span>
        </div>
        <div className="hbar-list">
          {totalCriado > 0 ? (
            <>
              {!criadorSel && (
                <>
                  <div className="comp-bar">
                    {criadoPnib > 0 && (
                      <span
                        className="comp-seg"
                        style={{ width: `${(criadoPnib / totalCriado) * 100}%`, background: "#1565c0" }}
                        title={`PNIB: ${fmtBR(criadoPnib)} numerações`}
                      />
                    )}
                    {criadoInterna > 0 && (
                      <span
                        className="comp-seg"
                        style={{ width: `${(criadoInterna / totalCriado) * 100}%`, background: "#4BA044" }}
                        title={`Interna SDA: ${fmtBR(criadoInterna)} numerações`}
                      />
                    )}
                  </div>
                  <div className="comp-legend">
                    {criadoPnib > 0 && (
                      <span><span className="dot" style={{ background: "#1565c0" }} />PNIB {Math.round((criadoPnib / totalCriado) * 100)}%</span>
                    )}
                    {criadoInterna > 0 && (
                      <span><span className="dot" style={{ background: "#4BA044" }} />Interna SDA {Math.round((criadoInterna / totalCriado) * 100)}%</span>
                    )}
                  </div>
                </>
              )}
              {criadoresFiltrados.map((c) => (
                <div className="hbar-row creator" key={c.nome}>
                  <span className="hbar-name" title={c.nome}>{c.nome}</span>
                  <div className="hbar-track">
                    <span className="hbar-fill" style={{ width: `${Math.round((c.value / maxCriador) * 100)}%`, background: c.color }} />
                  </div>
                  <span className="hbar-value">
                    {fmtBR(c.value)} · {Math.round((c.value / totalCriado) * 100)}%
                  </span>
                </div>
              ))}
              <p className="aging-note">
                {criadorSel
                  ? `${fmtBR(totalCriado)} numerações criadas por ${criadorSel.nome} — geração ${
                      criadorSel.modo === "auto" ? "automática" : "manual"
                    } (${criadorSel.origem === "interna" ? "faixas internas" : "faixas PNIB"}).`
                  : `${fmtBR(totalCriado)} numerações criadas — ${notaPartes.join(" e ")}.`}
              </p>
            </>
          ) : (
            <p className="aging-note">
              {criadorSel && !criadorCompativel
                ? "O criador selecionado não possui criações na origem filtrada."
                : "Nenhuma criação para o filtro selecionado."}
            </p>
          )}
        </div>
      </section>

      <div className="dash-grid dash-mt">
        {mostraLead && (
          <section className="panel">
            <div className="panel-head">
              <div>
                <h2>Lead time de reposição — PNIB</h2>
                <p>Solicitação → autorização → fabricação/entrega</p>
              </div>
            </div>
            <LeadTimeChart items={numberingDemo.leadTimePnib} />
          </section>
        )}

        <section className={`panel ${mostraLead ? "" : "span-2"}`}>
          <div className="panel-head">
            <div>
              <h2>Projeção por tipo</h2>
              <p>Dias restantes por categoria · média do período filtrado</p>
            </div>
          </div>
          <TipoProjection items={tipoCards} />
        </section>
      </div>

      <div className="dash-grid dash-mt">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Top destinatários</h2>
              <p>Fábricas com maior volume de faixas recebidas</p>
            </div>
          </div>
          <div className="hbar-list">
            {destFiltrados.length > 0 ? (
              destFiltrados.map((d) => (
                <div className="hbar-row" key={d.nome}>
                  <span className="hbar-name" title={d.nome}>{d.nome}</span>
                  <div className="hbar-track">
                    <span className="hbar-fill" style={{ width: `${Math.round((d.value / maxDest) * 100)}%` }} />
                  </div>
                  <span className="hbar-value">{fmtBR(d.value)}</span>
                </div>
              ))
            ) : (
              <p className="aging-note">Nenhum destinatário para o filtro selecionado.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Aging do estoque disponível</h2>
              <p>Tempo de cadastro das faixas ainda não distribuídas{tipoSuffix}</p>
            </div>
          </div>
          <AgingChart buckets={agingBuckets} />
        </section>
      </div>
    </div>
  );
}

function PedidosSdaPage({ notify }: { notify: (m: string) => void }) {
  type PedidoSda = {
    id: number;
    ator: string;
    tipo: string;
    qtd: number;
    itens: string;
    situacao: "SOLICITADO" | "ENVIADO" | "CONCLUIDO" | "RECUSADO";
    data: string;
    mov: string | null;
  };
  const [pedidos, setPedidos] = useState<PedidoSda[]>([
    {
      id: 1,
      ator: "Agropecuária Pampa Sul Ltda.",
      tipo: "ESTOQUISTA · PJ (Regime NOVO)",
      qtd: 480,
      itens: "FX-C01 · 240 brincos · FX-C02 · 240 brincos",
      situacao: "SOLICITADO",
      data: "16/06/2025",
      mov: null,
    },
    {
      id: 2,
      ator: "Prefeitura Municipal de Bagé",
      tipo: "ESTOQUISTA · PREFEITURA (Regime NOVO)",
      qtd: 960,
      itens: "FX-C01 · 240 · FX-C02 · 120 · FX-C03 · 600 (faixas complementares)",
      situacao: "ENVIADO",
      data: "15/06/2025",
      mov: "#MOV-2025-1847",
    },
    {
      id: 3,
      ator: "João Pedro Fagundes",
      tipo: "PRODUTOR",
      qtd: 60,
      itens: "FX-C02 · 60 brincos",
      situacao: "CONCLUIDO",
      data: "14/06/2025",
      mov: "#MOV-2025-1842",
    },
    {
      id: 4,
      ator: "Comercial Rural Tradição Ltda.",
      tipo: "ESTOQUISTA · PJ (Regime LEGADO)",
      qtd: 240,
      itens: "FX-C01 · 240 brincos",
      situacao: "RECUSADO",
      data: "13/06/2025",
      mov: null,
    },
  ]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [recusing, setRecusing] = useState<PedidoSda | null>(null);
  const [reason, setReason] = useState("");
  const [atending, setAtending] = useState<PedidoSda | null>(null);
  const [atendMode, setAtendMode] = useState<"estoque" | "fabricar">("estoque");
  const [atendBrincoTipo, setAtendBrincoTipo] = useState<"SISBOV" | "INTERNACIONAL">("INTERNACIONAL");
  const [atendOrigem, setAtendOrigem] = useState<"Interna" | "PNIB">("Interna");
  const [atendPnib, setAtendPnib] = useState<"existente" | "nova">("existente");
  const [atendDestino, setAtendDestino] = useState<"sede" | "direto">("direto");
  const [atendFabrica, setAtendFabrica] = useState("Identifica Brasil S.A. — Porto Alegre/RS");
  function situacaoBadge(s: PedidoSda["situacao"]) {
    if (s === "SOLICITADO") return <Badge tone="yellow">Solicitado</Badge>;
    if (s === "ENVIADO") return <Badge tone="blue">Enviado</Badge>;
    if (s === "CONCLUIDO") return <Badge tone="green">Concluído</Badge>;
    return <Badge tone="red">Recusado</Badge>;
  }
  function abrirAtendimento(p: PedidoSda) {
    setAtending(p);
    setAtendMode("estoque");
    setAtendOrigem("Interna");
    setAtendPnib("existente");
    setAtendDestino("direto");
    setAtendFabrica("Identifica Brasil S.A. — Porto Alegre/RS");
  }
  function confirmarAtendimento() {
    if (!atending) return;
    setPedidos((current) =>
      current.map((item) =>
        item.id === atending.id
          ? { ...item, situacao: "ENVIADO", mov: `#MOV-2025-18${50 + item.id}` }
          : item,
      ),
    );
    if (atendMode === "estoque") {
      notify(
        `Pedido aprovado — transferência ESTOQUE SDA → ${atending.ator} registrada e vinculada. O destino confirma pela leitura do código de barras.`,
      );
    } else {
      const origem =
        atendOrigem === "Interna"
          ? "faixa INTERNA gerada automaticamente pelo pool"
          : atendPnib === "existente"
            ? "faixa PNIB já disponível vinculada ao pedido"
            : "solicitação de faixa nova registrada ao PNIB (aguardando integração)";
      const destino =
        atendDestino === "sede"
          ? "os brincos fabricados entram no estoque central e o pedido segue o ciclo padrão"
          : `a fábrica envia os brincos direto a ${atending.ator}`;
      notify(
        `Pedido aprovado — fabricação nova via ${atendFabrica.split(" —")[0]} (${
          atendBrincoTipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"
        }, ${origem}). ${destino}.`,
      );
    }
    setAtending(null);
  }
  function confirmarRecusa() {
    if (recusing && reason.trim()) {
      setPedidos((current) =>
        current.map((item) =>
          item.id === recusing.id ? { ...item, situacao: "RECUSADO" } : item,
        ),
      );
      notify("Pedido recusado com motivo registrado na trilha de auditoria.");
      setRecusing(null);
      setReason("");
    }
  }
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Pedidos ao estoque central SDA</h2>
            <p>O ator que está pedindo é especificado no pedido; o envio gera a transferência vinculada.</p>
          </div>
          <Link to="novo" className="btn primary">
            <Icon name="plus" /> Novo pedido
          </Link>
        </div>
        <div className="filters">
          <div className="search-field">
            <Icon name="search" />
            <input placeholder="Buscar ator solicitante..." />
          </div>
          <select>
            <option>Todas as situações</option>
            <option>Solicitado</option>
            <option>Enviado</option>
            <option>Concluído</option>
            <option>Recusado</option>
          </select>
          <span className="result-count">{pedidos.length} pedidos</span>
        </div>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Ator que está pedindo</th>
                <th>Quantidade</th>
                <th>Situação</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {pedidos.map((p) => (
                <Fragment key={p.id}>
                  <tr className={expanded === p.id ? "expanded-row" : ""}>
                    <td>
                      <button
                        className="movement-id"
                        onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                      >
                        #PED-SDA-{p.id} <span>{expanded === p.id ? "⌃" : "⌄"}</span>
                      </button>
                    </td>
                    <td>
                      <strong>{p.ator}</strong>
                      <small>{p.tipo}</small>
                    </td>
                    <td>
                      <strong>{p.qtd}</strong>
                    </td>
                    <td>{situacaoBadge(p.situacao)}</td>
                    <td>{p.data}</td>
                    <td>
                      <div className="action-cell">
                        {p.situacao === "SOLICITADO" && (
                          <>
                            <button className="text-btn" onClick={() => abrirAtendimento(p)}>
                              Aprovar e enviar
                            </button>
                            <button
                              className="text-btn danger-link"
                              onClick={() => setRecusing(p)}
                            >
                              Recusar
                            </button>
                          </>
                        )}
                        <button
                          className="icon-btn"
                          onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === p.id && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <div>
                          <section>
                            <span>CICLO DO PEDIDO (RN-014)</span>
                            <strong>
                              {p.situacao === "SOLICITADO"
                                ? "Solicitado — aguardando aprovação da SEAPI"
                                : p.situacao === "ENVIADO"
                                  ? "Enviado — aguardando confirmação por leitura no destino"
                                  : p.situacao === "CONCLUIDO"
                                    ? "Concluído — destino confirmou pela leitura"
                                    : "Recusado"}
                            </strong>
                          </section>
                          {p.itens && (
                            <section>
                              <span>ITENS DO PEDIDO (brincos específicos)</span>
                              <strong>{p.itens}</strong>
                            </section>
                          )}
                          {p.mov && (
                            <section>
                              <span>MOVIMENTO DE ENVIO VINCULADO</span>
                              <a>
                                {p.mov} · Transferência ESTOQUE SDA → {p.ator}
                              </a>
                            </section>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span>Exibindo {pedidos.length} pedidos · estoque central como origem única</span>
        </div>
      </section>
      {atending && (
        <ModalShell
          title={`Atender pedido #PED-SDA-${atending.id}`}
          subtitle={`${atending.ator} · ${atending.qtd} brincos — escolha a rota de atendimento (RN-014 · RN-017).`}
          onClose={() => setAtending(null)}
        >
          <div className="modal-body">
            <div className="segmented atend-mode-toggle">
              <button
                className={atendMode === "estoque" ? "selected" : ""}
                onClick={() => setAtendMode("estoque")}
              >
                Atender do estoque central
              </button>
              <button
                className={atendMode === "fabricar" ? "selected" : ""}
                onClick={() => setAtendMode("fabricar")}
              >
                Fabricar novo via fábrica
              </button>
            </div>
            {atendMode === "estoque" ? (
              <p className="modal-copy">
                A transferência <strong>ESTOQUE SDA → {atending.ator}</strong> será registrada
                e vinculada ao pedido — o destino confirma pela leitura do código de barras
                (RN-014).
              </p>
            ) : (
              <>
                <label className="scan-input compact">
                  <span>TIPO DO BRINCO</span>
                  <select
                    value={atendBrincoTipo}
                    disabled={atendOrigem === "PNIB"}
                    onChange={(e) =>
                      setAtendBrincoTipo(e.target.value as "SISBOV" | "INTERNACIONAL")
                    }
                  >
                    <option value="SISBOV">Nacional · SISBOV (105)</option>
                    <option value="INTERNACIONAL">Internacional (076)</option>
                  </select>
                </label>
                <label className="scan-input compact">
                  <span>ORIGEM DA FAIXA DEDICADA</span>
                  <select
                    value={atendOrigem}
                    onChange={(e) => {
                      const value = e.target.value as "Interna" | "PNIB";
                      setAtendOrigem(value);
                      if (value === "PNIB") setAtendBrincoTipo("INTERNACIONAL");
                    }}
                  >
                    <option value="Interna">
                      Interna — pool sequencial gera automaticamente
                    </option>
                    <option value="PNIB">PNIB — faixa existente ou solicitar nova</option>
                  </select>
                </label>
                {atendOrigem === "PNIB" && (
                  <>
                    <div className="segmented atend-mode-toggle">
                      <button
                        className={atendPnib === "existente" ? "selected" : ""}
                        onClick={() => setAtendPnib("existente")}
                      >
                        Usar faixa PNIB já disponível
                      </button>
                      <button
                        className={atendPnib === "nova" ? "selected" : ""}
                        onClick={() => setAtendPnib("nova")}
                      >
                        Solicitar faixa nova ao PNIB
                      </button>
                    </div>
                    <p className="modal-copy">
                      O PNIB fornece somente o padrão Internacional (076) — o tipo fica
                      fixo.
                      {atendPnib === "nova" &&
                        " O pedido aguarda a resposta da integração antes de prosseguir para a fábrica."}
                    </p>
                  </>
                )}
                <label className="scan-input compact">
                  <span>FÁBRICA</span>
                  <select
                    value={atendFabrica}
                    onChange={(e) => setAtendFabrica(e.target.value)}
                  >
                    <option>Identifica Brasil S.A. — Porto Alegre/RS</option>
                    <option>Brinco Sul Indústria Ltda. — Caxias do Sul/RS</option>
                  </select>
                </label>
                <div>
                  <span className="field-label">DESTINO DA FABRICAÇÃO</span>
                  <div className="segmented atend-mode-toggle">
                    <button
                      className={atendDestino === "sede" ? "selected" : ""}
                      onClick={() => setAtendDestino("sede")}
                    >
                      Sede SEAPI (estoque central)
                    </button>
                    <button
                      className={atendDestino === "direto" ? "selected" : ""}
                      onClick={() => setAtendDestino("direto")}
                    >
                      Direto ao solicitante
                    </button>
                  </div>
                </div>
                <p className="modal-copy">
                  A faixa dedicada ao pedido nasce{" "}
                  {atendOrigem === "Interna"
                    ? "automaticamente do pool interno, do tipo escolhido (RN-008)"
                    : "da faixa PNIB vinculada ao pedido (076)"}
                  .{" "}
                  {atendDestino === "sede"
                    ? "Os brincos fabricados entram no estoque central e o pedido segue o ciclo padrão."
                    : `A fábrica envia os brincos direto a ${atending.ator} — o estoque central não entra no caminho (RN-017).`}
                </p>
              </>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setAtending(null)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={confirmarAtendimento}>
              {atendMode === "estoque" ? "Aprovar e enviar" : "Aprovar e encaminhar à fábrica"}
            </button>
          </div>
        </ModalShell>
      )}
      {recusing && (
        <ModalShell
          title={`Recusar pedido #PED-SDA-${recusing.id}`}
          subtitle="O motivo é obrigatório e fica registrado na trilha de auditoria."
          onClose={() => setRecusing(null)}
        >
          <div className="modal-body">
            <label className={`scan-input compact ${reason.trim() ? "" : "has-error"}`}>
              <span>MOTIVO DA RECUSA</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: estoque central sem posição para o tipo solicitado"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setRecusing(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={!reason.trim()}
              onClick={confirmarRecusa}
            >
              Confirmar recusa
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

function PedidoSdaFormPage({ notify, role }: { notify: (m: string) => void; role: Role }) {
  const navigate = useNavigate();
  const [newActor, setNewActor] = useState("Agropecuária Pampa Sul Ltda.");
  const [newItems, setNewItems] = useState<string[]>([]);
  const centralRanges = [
    { id: "FX-C01", start: "105430055956039", end: "105430055956278", qty: 240 },
    { id: "FX-C02", start: "105430055954801", end: "105430055954920", qty: 120 },
    { id: "FX-C03", start: "076210077183401", end: "076210077183420", qty: 20 },
  ];
  const selectedQty = centralRanges
    .filter((range) => newItems.includes(range.id))
    .reduce((n, range) => n + range.qty, 0);
  const atores = [
    "Agropecuária Pampa Sul Ltda.",
    "Comercial Rural Tradição Ltda. (Regime LEGADO)",
    "Antônio Carlos Silveira",
    "Prefeitura Municipal de Bagé",
    "João Pedro Fagundes",
  ];
  function toggleItem(rangeId: string) {
    setNewItems((current) =>
      current.includes(rangeId)
        ? current.filter((id) => id !== rangeId)
        : [...current, rangeId],
    );
  }
  function criarPedido() {
    if (selectedQty === 0) {
      notify("Selecione ao menos uma faixa do estoque central para compor o pedido.");
      return;
    }
    notify("Pedido composto com brincos específicos — aguardando aprovação da SEAPI.");
    navigate(`/${role}/pedidos-sda`);
  }
  return (
    <div className="request-layout">
      <section className="panel request-form">
        <div className="panel-head">
          <div>
            <h2>Novo pedido de brincos</h2>
            <p>
              Componha o pedido selecionando as faixas do estoque central — o ator que está pedindo
              é especificado e a quantidade é derivada da composição (RN-014 · CR-008).
            </p>
          </div>
        </div>
        <div className="modal-body form-grid">
          <label className="wide scan-input compact">
            <span>ATOR QUE ESTÁ PEDINDO</span>
            <select value={newActor} onChange={(e) => setNewActor(e.target.value)}>
              {atores.map((ator) => (
                <option key={ator}>{ator}</option>
              ))}
            </select>
          </label>
          <label className="wide scan-input compact">
            <span>ORIGEM (ÚNICA POR CONFIGURAÇÃO)</span>
            <div>
              <input disabled value="Estoque central SDA" />
            </div>
          </label>
        </div>
        <div className="stock-picker-head" style={{ padding: "0 24px" }}>
          <div>
            <strong>Brincos do estoque central</strong>
            <span>Adicionar/remover a qualquer momento — padrão salvarBrincos do legado</span>
          </div>
          <span className={`selection-count ${newItems.length ? "has-selection" : ""}`}>
            {selectedQty} brincos em {newItems.length} faixas
          </span>
        </div>
        <div className="stock-range-picker" style={{ margin: "0 24px 24px" }}>
          {centralRanges.map((range) => {
            const isSelected = newItems.includes(range.id);
            return (
              <button
                key={range.id}
                className={isSelected ? "selected" : ""}
                onClick={() => toggleItem(range.id)}
              >
                <span className="selection-check">
                  {isSelected && <Icon name="check" size={13} />}
                </span>
                <span className="range-picker-copy">
                  <small>{range.id}</small>
                  <strong>
                    {formatTag(range.start)} <i>a</i> {formatTag(range.end)}
                  </strong>
                </span>
                <span className="range-picker-qty">
                  <strong>{range.qty}</strong>
                  <small>brincos</small>
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "0 24px 24px" }}>
          <p className="modal-copy">
            O envio manda <strong>exatamente os brincos selecionados</strong> — a quantidade é
            derivada da composição (padrão do legado: salvarBrincos/removerBrincos, quantidade
            enviada = solicitada). Ao aprovar, o envio gera uma transferência vinculada a este
            pedido; o destino confirma pela leitura do código de barras.
          </p>
        </div>
        <div className="request-submit">
          <p>
            <Icon name="alert" /> A SEAPI receberá o pedido imediatamente.
          </p>
          <div style={{ display: "flex", gap: 12 }}>
            <Link className="btn secondary" to={`/${role}/pedidos-sda`}>
              Cancelar
            </Link>
            <button className="btn primary" disabled={selectedQty === 0} onClick={criarPedido}>
              Registrar pedido
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FactoryPage({ notify }: { notify: (m: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [boxes, setBoxes] = useState([{ id: 1, start: "105430055956039", end: "105430055956278" }]);
  const orders = [
    {
      id: 47,
      store: "Agropecuária Pampa Sul Ltda.",
      city: "Bagé/RS",
      qty: 240,
      date: "12/06/2025",
      status: "Pendente",
    },
    {
      id: 46,
      store: "Cooperativa Campos de Cima",
      city: "Vacaria/RS",
      qty: 500,
      date: "11/06/2025",
      status: "Em produção",
    },
    {
      id: 42,
      store: "Casa Rural Missões Ltda.",
      city: "Santo Ângelo/RS",
      qty: 120,
      date: "08/06/2025",
      status: "Enviado",
    },
  ];
  const selectedOrder = orders.find((order) => order.id === selected);
  const distributedStart = 105430055950001;
  const distributedEnd = 105430055960000;
  const boxesComplete = boxes.every(
    (box) => box.start.replace(/\D/g, "").length === 15 && box.end.replace(/\D/g, "").length === 15,
  );
  const boxesInsideAllocation = boxes.every((box) => {
    const start = Number(box.start.replace(/\D/g, ""));
    const end = Number(box.end.replace(/\D/g, ""));
    return start >= distributedStart && end <= distributedEnd && end >= start;
  });
  const hasOverlap = boxes.some((box, index) =>
    boxes.some(
      (other, otherIndex) =>
        index !== otherIndex &&
        Number(box.start) <= Number(other.end) &&
        Number(box.end) >= Number(other.start),
    ),
  );
  const shipmentQuantity = boxesComplete
    ? boxes.reduce((total, box) => total + (Number(box.end) - Number(box.start) + 1), 0)
    : 0;
  const quantityMismatch = !!selectedOrder && shipmentQuantity !== selectedOrder.qty;
  const invalid = !boxesComplete || !boxesInsideAllocation || hasOverlap || quantityMismatch;
  return (
    <>
      <section className="stats-grid numbering-stats">
        <article className="stat">
          <div className="stat-icon yellow">
            <Icon name="history" />
          </div>
          <div>
            <span>Pedidos pendentes</span>
            <strong>4</strong>
            <small>aguardando ação</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon blue">
            <Icon name="factory" />
          </div>
          <div>
            <span>Em produção</span>
            <strong>2</strong>
            <small>pedidos</small>
          </div>
        </article>
        <article className="stat">
          <div className="stat-icon green">
            <Icon name="transfer" />
          </div>
          <div>
            <span>Enviados no mês</span>
            <strong>18</strong>
            <small>pedidos</small>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Pedidos das lojas</h2>
            <p>Ordenados por data da solicitação</p>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Solicitante</th>
                <th>Data</th>
                <th>Quantidade</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="tag-number">#PED-2025-{String(o.id).padStart(4, "0")}</td>
                  <td className="route-cell">
                    <strong>{o.store}</strong>
                    <span>{o.city}</span>
                  </td>
                  <td>{o.date}</td>
                  <td>
                    <strong>{o.qty} brincos</strong>
                  </td>
                  <td>
                    <Badge tone={o.status === "Enviado" ? "green" : "yellow"}>{o.status}</Badge>
                  </td>
                  <td>
                    {o.status !== "Enviado" ? (
                      <button className="btn small primary" onClick={() => setSelected(o.id)}>
                        Declarar envio
                      </button>
                    ) : (
                      <button className="text-btn">Ver envio</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {selected && (
        <ModalShell
          title={`Declarar Pedido #PED-2026-${String(selected).padStart(4, "0")}`}
          subtitle="Cada caixa deve conter uma faixa, identificada por dois códigos de barras."
          onClose={() => setSelected(null)}
        >
          <div className="modal-body">
            <div className="allocation-note">
              <Icon name="hash" />
              <div>
                <span>FAIXA DISTRIBUÍDA À FÁBRICA</span>
                <strong>
                  {formatTag("105430055950001")} a {formatTag("105430055960000")}
                </strong>
              </div>
            </div>
            <div className="box-form-head">
              <div>
                <strong>Caixas e códigos de barras</strong>
                <span>1 caixa = 1 faixa = código inicial + código final</span>
              </div>
              <button
                className="text-btn"
                onClick={() =>
                  setBoxes((prev) => [...prev, { id: Date.now(), start: "", end: "" }])
                }
              >
                <Icon name="plus" size={15} /> Adicionar caixa
              </button>
            </div>
            {boxes.map((box, i) => (
              <div className="box-row" key={box.id}>
                <div className="box-row-title">
                  <span className="box-number">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <b>CAIXA {String(i + 1).padStart(2, "0")}</b>
                    <small>Uma faixa · dois códigos</small>
                  </span>
                </div>
                <label>
                  <span>1 · CÓDIGO DE BARRAS INICIAL</span>
                  <input
                    value={box.start}
                    placeholder="15 dígitos"
                    onChange={(e) =>
                      setBoxes((prev) =>
                        prev.map((x) => (x.id === box.id ? { ...x, start: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <label>
                  <span>2 · CÓDIGO DE BARRAS FINAL</span>
                  <input
                    value={box.end}
                    placeholder="15 dígitos"
                    onChange={(e) =>
                      setBoxes((prev) =>
                        prev.map((x) => (x.id === box.id ? { ...x, end: e.target.value } : x)),
                      )
                    }
                  />
                </label>
                <div className="box-row-quantity">
                  <strong>
                    {box.start.length === 15 &&
                    box.end.length === 15 &&
                    Number(box.end) >= Number(box.start)
                      ? Number(box.end) - Number(box.start) + 1
                      : "—"}
                  </strong>
                  <span>brincos</span>
                </div>
                {i > 0 && (
                  <button
                    className="icon-btn"
                    onClick={() => setBoxes((prev) => prev.filter((x) => x.id !== box.id))}
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
            ))}
            {!boxesComplete && (
              <p className="form-error">
                <Icon name="alert" size={15} /> Leia os dois códigos de 15 dígitos de cada caixa.
              </p>
            )}
            {boxesComplete && !boxesInsideAllocation && (
              <p className="form-error">
                <Icon name="alert" size={15} /> Uma das faixas não pertence à numeração distribuída
                a esta fábrica.
              </p>
            )}
            {hasOverlap && (
              <p className="form-error">
                <Icon name="alert" size={15} /> As faixas das caixas não podem se sobrepor.
              </p>
            )}
            {boxesComplete && boxesInsideAllocation && !hasOverlap && quantityMismatch && (
              <p className="form-error">
                <Icon name="alert" size={15} /> As caixas totalizam {shipmentQuantity} brincos, mas
                o pedido exige {selectedOrder?.qty}.
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setSelected(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={invalid}
              onClick={() => {
                setSelected(null);
                notify("Envio declarado. A loja já pode receber as caixas com o leitor.");
              }}
            >
              Confirmar e declarar envio
            </button>
          </div>
        </ModalShell>
      )}
    </>
  );
}

export function RequestDetailPage() {
  const { requestId } = useParams();
  const context = useOutletContext<PrototypeContext>();
  const request = context.requests.find((item) => item.id === requestId);

  if (!request) {
    return (
      <section className="panel movement-not-found">
        <div className="empty">
          <div>
            <Icon name="alert" size={27} />
          </div>
          <strong>Solicitação não encontrada</strong>
          <span>O pedido informado não existe ou não está disponível para este perfil.</span>
          <Link className="btn secondary" to={`/${context.role}/solicitar`}>
            Voltar às solicitações
          </Link>
        </div>
      </section>
    );
  }

  const statusTone =
    request.status === "Atendida" ? "green" : request.status === "Recusada" ? "red" : "yellow";

  return (
    <>
      <div className="request-detail-actions">
        <Link className="back-link" to={`/${context.role}/solicitar`}>
          <span>←</span> Voltar às solicitações
        </Link>
        <Badge tone={statusTone}>{request.status}</Badge>
      </div>

      <section className="request-detail-summary">
        <div className="request-detail-icon">
          <Icon name="request" size={23} />
        </div>
        <div>
          <span>SOLICITAÇÃO DE BRINCOS</span>
          <h2>#PED-2026-{request.id}</h2>
          <p>
            Registrada em {request.date} · Última atualização em {request.updatedAt}
          </p>
        </div>
        <div className="request-detail-quantity">
          <strong>{request.quantity}</strong>
          <span>brincos solicitados</span>
        </div>
      </section>

      <div className="request-detail-grid">
        <section className="panel request-detail-panel">
          <div className="panel-head">
            <div>
              <h2>Dados da solicitação</h2>
              <p>Informações enviadas pela loja</p>
            </div>
          </div>
          <dl className="request-detail-list">
            <div>
              <dt>Solicitante</dt>
              <dd>Agropecuária Pampa Sul Ltda.</dd>
            </div>
            <div>
              <dt>Município</dt>
              <dd>Bagé/RS</dd>
            </div>
            <div>
              <dt>Quantidade</dt>
              <dd>{request.quantity} brincos</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>Mariana Teixeira Oliveira</dd>
            </div>
            <div className="wide">
              <dt>Observação</dt>
              <dd>Reposição programada para atendimento aos produtores da região.</dd>
            </div>
          </dl>
        </section>

        <section className="panel request-detail-panel factory-request-panel">
          <div className="panel-head">
            <div>
              <h2>Atendimento da fábrica</h2>
              <p>Produção, embalagem e expedição</p>
            </div>
          </div>
          <dl className="request-detail-list">
            <div className="wide">
              <dt>Fábrica responsável</dt>
              <dd>{request.factory}</dd>
            </div>
            <div className="request-status-field">
              <dt>Situação</dt>
              <dd>
                <Badge tone={statusTone}>{request.status}</Badge>
              </dd>
            </div>
            {request.status === "Atendida" && (
              <>
                <div>
                  <dt>Caixas declaradas</dt>
                  <dd>2 caixas</dd>
                </div>
                <div>
                  <dt>Data do envio</dt>
                  <dd>02/06/2025</dd>
                </div>
              </>
            )}
            {request.status === "Recusada" && (
              <div className="wide request-refusal">
                <dt>Motivo da recusa</dt>
                <dd>Quantidade indisponível para o prazo solicitado.</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <section className="panel request-progress-panel">
        <div className="panel-head">
          <div>
            <h2>Andamento da solicitação</h2>
            <p>Eventos registrados entre a loja e a fábrica.</p>
          </div>
        </div>
        <div className="request-progress">
          <article className="done">
            <span className="request-progress-marker">
              <Icon name="check" size={15} />
            </span>
            <div>
              <span>{request.date} · 10:18</span>
              <strong>Solicitação enviada</strong>
              <p>Pedido registrado pela Agropecuária Pampa Sul.</p>
            </div>
          </article>
          <article className={request.status !== "Recusada" ? "done" : "rejected"}>
            <span className="request-progress-marker">
              <Icon name={request.status === "Recusada" ? "close" : "factory"} size={15} />
            </span>
            <div>
              <span>{request.updatedAt}</span>
              <strong>
                {request.status === "Recusada"
                  ? "Solicitação recusada"
                  : request.status === "Atendida"
                    ? "Produção concluída"
                    : "Aguardando atendimento da fábrica"}
              </strong>
              <p>
                {request.status === "Recusada"
                  ? "A fábrica informou indisponibilidade para o prazo."
                  : request.status === "Atendida"
                    ? "Brincos produzidos e organizados em caixas."
                    : "O pedido está na fila de produção da fábrica."}
              </p>
            </div>
          </article>
          {request.status === "Atendida" && (
            <article className="done">
              <span className="request-progress-marker">
                <Icon name="transfer" size={15} />
              </span>
              <div>
                <span>02/06/2025 · 16:42</span>
                <strong>Envio declarado</strong>
                <p>As caixas já podem ser recebidas pela loja com o leitor.</p>
              </div>
            </article>
          )}
        </div>
      </section>
    </>
  );
}

function RequestPage({
  role,
  requests,
  onCreate,
}: {
  role: Role;
  requests: RequestRecord[];
  onCreate: (quantity: number, factory: string) => void;
}) {
  const [qty, setQty] = useState(240);
  const [destination, setDestination] = useState("Identifica Brasil S.A. — Porto Alegre/RS");
  const isSeapi = destination === SEAPI_LABEL;
  return (
    <div className="request-layout">
      <section className="panel request-form">
        <div className="panel-head">
          <div>
            <h2>Nova solicitação</h2>
            <p>
              {isSeapi
                ? "Informe a quantidade necessária — a SEAPI fabricará com faixa dedicada."
                : "Informe a fábrica e a quantidade necessária."}
            </p>
          </div>
        </div>
        <div className="modal-body form-grid">
          <label className="wide">
            <span>{isSeapi ? "Solicitar diretamente à SEAPI" : "Fábrica habilitada"}</span>
            <select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option>Identifica Brasil S.A. — Porto Alegre/RS</option>
              <option>Brinco Sul Indústria Ltda. — Caxias do Sul/RS</option>
              <option>{SEAPI_LABEL}</option>
            </select>
          </label>
          <label className="wide">
            <span>Quantidade de brincos</span>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
            />
            {qty <= 0 && (
              <small className="field-error">Informe uma quantidade maior que zero.</small>
            )}
          </label>
          <label className="wide">
            <span>Observação</span>
            <textarea placeholder="Opcional" />
          </label>
          {isSeapi && (
            <div className="seapi-flow-note">
              <Icon name="factory" size={15} />
              <p>
                <strong>
                  Você pode pedir brincos diretamente à SEAPI (RN-017).</strong> Ao atender,
                  a SEAPI decide o tipo de brinco, escolhe a fábrica e o sistema gera
                  automaticamente uma <strong>faixa dedicada ao seu pedido</strong> — os
                  brincos fabricados chegam direto ao seu estoque, com confirmação pela
                  leitura do código de barras.
              </p>
            </div>
          )}
        </div>
        <div className="request-submit">
          <p>
            <Icon name="alert" />
            {isSeapi
              ? " A SEAPI receberá a solicitação imediatamente."
              : " A fábrica receberá a solicitação imediatamente."}
          </p>
          <button
            className="btn primary"
            disabled={qty <= 0}
            onClick={() => onCreate(qty, destination)}
          >
            Enviar solicitação
          </button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Minhas solicitações</h2>
            <p>Acompanhe o atendimento dos pedidos.</p>
          </div>
        </div>
        <div className="request-list">
          {requests.map((r) => (
            <article key={r.id}>
              <div className="request-icon">
                <Icon name="request" />
              </div>
              <div>
                <Link to={`/${role}/solicitar/${r.id}`}>
                  <strong>#PED-2026-{r.id}</strong>
                </Link>
                <span>{r.factory}</span>
                <small>Solicitado em {r.date}</small>
              </div>
              <div className="request-qty">
                <strong>{r.quantity}</strong>
                <span>brincos</span>
              </div>
              <Badge
                tone={
                  r.status === "Atendida" ? "green" : r.status === "Recusada" ? "red" : "yellow"
                }
              >
                {r.status}
              </Badge>
              <Link
                className="icon-btn"
                to={`/${role}/solicitar/${r.id}`}
                aria-label={`Ver detalhes da solicitação #PED-2026-${r.id}`}
                title="Ver detalhes da solicitação"
              >
                <Icon name="chevron" size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function TransferModal({ close, finish }: { close: () => void; finish: (m: string) => void }) {
  const [dest, setDest] = useState("");
  return (
    <ModalShell
      title="Transferir brincos"
      subtitle="A custódia será alterada após a confirmação."
      onClose={close}
    >
      <div className="modal-body">
        <div className="movement-summary">
          <span>FAIXA SELECIONADA</span>
          <strong>
            {formatTag("105430055956039")} a {formatTag("105430055956278")}
          </strong>
          <small>240 brincos disponíveis</small>
        </div>
        <label className="field">
          <span>Destino da transferência</span>
          <select value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="">Selecione um estoquista...</option>
            <option>Antônio Carlos Silveira — PF</option>
            <option>Comercial Rural Tradição Ltda. — PJ</option>
            <option>Depósito central SEAPI</option>
          </select>
        </label>
        <div className="warning-box">
          <Icon name="alert" />
          <p>
            <strong>Confirme o destinatário</strong>Esta ação transfere a custódia da faixa inteira
            e gera uma movimentação auditável.
          </p>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn primary"
          disabled={!dest}
          onClick={() =>
            finish("Transferência concluída. O estoque do destinatário foi atualizado.")
          }
        >
          Confirmar transferência
        </button>
      </div>
    </ModalShell>
  );
}

function LossModal({ close, finish }: { close: () => void; finish: (m: string) => void }) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell
      title="Registrar perda"
      subtitle="Esta saída não possui destinatário e exige justificativa."
      onClose={close}
    >
      <div className="modal-body">
        <div className="danger-banner">
          <Icon name="alert" />
          <div>
            <strong>Atenção: baixa de estoque</strong>
            <span>
              Os brincos informados deixarão de estar disponíveis para uso ou transferência.
            </span>
          </div>
        </div>
        <label className="field">
          <span>Justificativa obrigatória</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva as circunstâncias da perda..."
            maxLength={300}
          />
          <small>{reason.length}/300 caracteres</small>
        </label>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={close}>
          Cancelar
        </button>
        <button
          className="btn danger"
          disabled={!reason.trim()}
          onClick={() => finish("Perda registrada com justificativa na trilha de auditoria.")}
        >
          Confirmar registro de perda
        </button>
      </div>
    </ModalShell>
  );
}

function SaleConfirmModal({
  close,
  finish,
  count,
  producer,
}: {
  close: () => void;
  finish: () => void;
  count: number;
  producer: string;
}) {
  return (
    <ModalShell
      title="Declarar venda ao produtor"
      subtitle="Revise os dados antes de concluir."
      onClose={close}
    >
      <div className="modal-body">
        <div className="sale-final">
          <div>
            <span>PRODUTOR</span>
            <strong>{producer}</strong>
            <small>Produtor selecionado e regular</small>
          </div>
          <div>
            <span>QUANTIDADE</span>
            <strong>{count || 1} brincos</strong>
            <small>Validados e disponíveis</small>
          </div>
        </div>
        <div className="danger-banner amber">
          <Icon name="alert" />
          <div>
            <strong>A venda é definitiva</strong>
            <span>
              Os brincos serão creditados ao produtor agora. Após declarar, a saída será apenas por
              devolução.
            </span>
          </div>
        </div>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={close}>
          Voltar e revisar
        </button>
        <button className="btn primary" onClick={finish}>
          Confirmar e declarar venda
        </button>
      </div>
    </ModalShell>
  );
}

function ReverseModal({ close, finish }: { close: () => void; finish: () => void }) {
  return (
    <ModalShell
      title="Devolver movimentação"
      subtitle="Uma nova movimentação será criada e vinculada à original."
      onClose={close}
    >
      <div className="modal-body">
        <div className="movement-summary">
          <span>MOVIMENTAÇÃO ORIGINAL</span>
          <strong>#MOV-2025-1841 · Venda</strong>
          <small>12 brincos · João Pedro Fagundes</small>
        </div>
        <div className="success-banner">
          <Icon name="check" />
          <div>
            <strong>Brincos elegíveis para devolução</strong>
            <span>Nenhum dos 12 brincos foi utilizado pelo produtor.</span>
          </div>
        </div>
        <p className="modal-copy">
          Ao confirmar, a custódia retornará à Agropecuária Pampa Sul e o vínculo com a venda
          original será preservado.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={close}>
          Cancelar
        </button>
        <button className="btn primary" onClick={finish}>
          Confirmar devolução
        </button>
      </div>
    </ModalShell>
  );
}

function VoidModal({ close, finish }: { close: () => void; finish: () => void }) {
  const [reason, setReason] = useState("");
  return (
    <ModalShell
      title="Estornar movimentação"
      subtitle="Ação exclusiva da fiscalização SEAPI."
      onClose={close}
    >
      <div className="modal-body">
        <div className="danger-banner">
          <Icon name="alert" />
          <div>
            <strong>Há brincos já utilizados</strong>
            <span>
              O estorno administrativo corrigirá a cadeia de custódia sem apagar o histórico.
            </span>
          </div>
        </div>
        <label className="field">
          <span>Justificativa obrigatória para o estorno</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Informe o motivo e a referência do processo administrativo..."
          />
          <small>Esta informação será permanente e auditável.</small>
        </label>
      </div>
      <div className="modal-actions">
        <button className="btn secondary" onClick={close}>
          Cancelar
        </button>
        <button className="btn danger" disabled={!reason.trim()} onClick={finish}>
          Confirmar estorno
        </button>
      </div>
    </ModalShell>
  );
}
