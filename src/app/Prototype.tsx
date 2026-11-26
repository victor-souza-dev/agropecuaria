import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Outlet, useLocation, useNavigate, useOutletContext, useParams, useSearchParams } from "react-router";

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
  | "automacoes"
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
  perfis: PerfilCatalogo[];
  setPerfis: React.Dispatch<React.SetStateAction<PerfilCatalogo[]>>;
  regras: Record<string, PerfilRegras>;
  setRegras: React.Dispatch<React.SetStateAction<Record<string, PerfilRegras>>>;
  auditoriaMatriz: AuditoriaMatrizRow[];
  registraAuditoria: (entry: AuditoriaMatrizRow) => void;
  auditoriaAutomacoes: Record<number, RegistroAuditoria[]>;
  registraEventoAutomacao: (id: number, alvo: string, evento: string, detalhe?: string) => void;
  auditoriaEstocadores: Record<string, RegistroAuditoria[]>;
  registraEventoEstocador: (nome: string, evento: string, detalhe?: string) => void;
  pedidosSda: PedidoSda[];
  setPedidosSda: React.Dispatch<React.SetStateAction<PedidoSda[]>>;
};

type RequestRecord = {
  id: string;
  factory: string;
  date: string;
  quantity: number;
  status: "Pendente" | "Atendida" | "Recusada";
  updatedAt: string;
};

type PedidoSda = {
  id: number;
  ator: string;
  municipio: string;
  atendente: string | null;
  tipo: string;
  qtd: number;
  composicao: { intervalo: string; qty: number }[];
  situacao: "SOLICITADO" | "ENVIADO" | "CONCLUIDO" | "RECUSADO";
  data: string;
  mov: string | null;
  fila: "pedido" | "movimentacao";
  aprovador: "SEAPI" | "DESTINO";
  motivo: string | null;
};

function pedidosSdaSeed(): PedidoSda[] {
  return [
    {
      id: 1,
      ator: "Agropecuária Pampa Sul Ltda.",
      municipio: "Pelotas",
      atendente: "Marina Duarte",
      tipo: "ESTOQUISTA · PJ · Ligado no novo",
      qtd: 360,
      composicao: [
        { intervalo: `${formatTag("076210077200001")} a ${formatTag("076210077200240")}`, qty: 240 },
        { intervalo: `${formatTag("076210077200241")} a ${formatTag("076210077200330")}`, qty: 120 },
      ],
      situacao: "SOLICITADO",
      data: "16/06/2025",
      mov: null,
      fila: "pedido",
      aprovador: "SEAPI",
      motivo: null,
    },
    {
      id: 2,
      ator: "Prefeitura Municipal de Bagé",
      municipio: "Bagé",
      atendente: null,
      tipo: "ESTOQUISTA · PREFEITURA · Ligado no novo",
      qtd: 380,
      composicao: [
        { intervalo: `${formatTag("076210077200001")} a ${formatTag("076210077200240")}`, qty: 240 },
        { intervalo: `${formatTag("076210077200241")} a ${formatTag("076210077200330")}`, qty: 120 },
        { intervalo: `${formatTag("076210077183401")} a ${formatTag("076210077183420")}`, qty: 20 },
      ],
      situacao: "ENVIADO",
      data: "15/06/2025",
      mov: "#MOV-2025-1847",
      fila: "pedido",
      aprovador: "SEAPI",
      motivo: null,
    },
    {
      id: 3,
      ator: "João Pedro Fagundes",
      municipio: "Dom Pedrito",
      atendente: null,
      tipo: "PRODUTOR · Ligado no novo",
      qtd: 60,
      composicao: [
        { intervalo: "sub-faixa da faixa, brincos sequenciais a definir na distribuição", qty: 60 },
      ],
      situacao: "CONCLUIDO",
      data: "14/06/2025",
      mov: "#MOV-2025-1842",
      fila: "pedido",
      aprovador: "SEAPI",
      motivo: null,
    },
    {
      id: 4,
      ator: "Comercial Rural Tradição Ltda.",
      municipio: "Santa Maria",
      atendente: "Carlos Menezes",
      tipo: "ESTOQUISTA · PJ · Ligado no novo",
      qtd: 240,
      composicao: [
        { intervalo: `${formatTag("076210077200001")} a ${formatTag("076210077200240")}`, qty: 240 },
      ],
      situacao: "RECUSADO",
      data: "13/06/2025",
      mov: null,
      fila: "pedido",
      aprovador: "SEAPI",
      motivo:
        "Estoque central sem posição para o tipo solicitado — recomendação: agendar para o próximo atendimento semanal.",
    },
    {
      id: 5,
      ator: "Prefeitura Municipal de Bagé",
      municipio: "Bagé",
      atendente: null,
      tipo: "TRANSFERÊNCIA · PREFEITURA → Habilitado",
      qtd: 20,
      composicao: [
        { intervalo: `${formatTag("076210077220000")} a ${formatTag("076210077220019")}`, qty: 20 },
      ],
      situacao: "SOLICITADO",
      data: "18/06/2025",
      mov: null,
      fila: "movimentacao",
      aprovador: "SEAPI",
      motivo: null,
    },
    {
      id: 6,
      ator: "Cooperativa Agropecuária Vale do Verde",
      municipio: "Lajeado",
      atendente: null,
      tipo: "TRANSFERÊNCIA · COOPERATIVA_LEITE → Habilitado",
      qtd: 15,
      composicao: [
        { intervalo: `${formatTag("105430057001000")} a ${formatTag("105430057001014")}`, qty: 15 },
      ],
      situacao: "SOLICITADO",
      data: "18/06/2025",
      mov: null,
      fila: "movimentacao",
      aprovador: "SEAPI",
      motivo: null,
    },
  ];
}

type PerfilCatalogo = { code: string; desc: string; holders: number; label?: string };

type PerfilRegras = Record<string, { origem: RegraFluxo; destino: RegraFluxo }>;

type AuditoriaMatrizRow = {
  data: string;
  usuario: string;
  perfil: string;
  celula: string;
  de: string;
  para: string;
};

// Histórico inicial da auditoria da matriz (RN-029) — rastro imutável, mais recente primeiro
const AUDITORIA_SEED: AuditoriaMatrizRow[] = [
  { data: "25/11 09:12", usuario: "victor.souza", perfil: "Produtor", celula: "Venda · Enviar", de: "Bloqueado", para: "Livre" },
  { data: "25/11 08:47", usuario: "seapi.fiscal", perfil: "Cooperativa de Leite", celula: "Transferência · Enviar", de: "Livre", para: "Escopo · 1 ator" },
  { data: "24/11 16:05", usuario: "victor.souza", perfil: "Habilitado", celula: "Venda · Receber", de: "Livre", para: "Com aprovação · destinatário" },
  { data: "24/11 15:58", usuario: "seapi.fiscal", perfil: "Fábrica de brincos", celula: "Abastecimento · Enviar", de: "Bloqueado", para: "Livre" },
];

// Catálogo inicial de perfis de estocador — fonte única para a tela de regras e os filtros do dashboard
const PERFIS_INICIAIS: PerfilCatalogo[] = [
  { code: "LOJA_AGROPECUARIA", desc: "Varejo do agro: vende brincos ao produtor rural no balcão, com leitura do código no ato da venda", holders: 2 },
  { code: "CREDENCIADO", desc: "Estocador credenciado pela SEAPI: mantém estoque próprio e movimenta brincos com os demais titulares da cadeia", holders: 2 },
  { code: "PREFEITURA", desc: "Estoque público municipal: brincos para programas e demandas do município", holders: 1 },
  { code: "COOPERATIVA_LEITE", desc: "Integradora de cooperativa de leite: centraliza brincos para os produtores associados da bacia leiteira", holders: 1 },
  { code: "INSPETORIA", desc: "Unidade da Defesa Agropecuária no município-sede: serviço veterinário oficial com estoque próprio", holders: 0 },
  { code: "POSTO", desc: "Unidade de atendimento da Defesa Agropecuária, vinculada a uma Inspetoria (IDA): atende o produtor na região e se abastece pela IDA de origem", holders: 0 },
  { code: "SEAPI", desc: "Estoque central da Secretaria: mantém o estoque oficial e governa as regras da cadeia de custódia", holders: 1 },
  { code: "FABRICA", desc: "Produz os brincos e declara o envio — nunca tem posse: a custódia abre direto no destinatário", holders: 1 },
  { code: "PRODUTOR", desc: "Fim da linha da custódia: recebe os brincos para aplicar nos animais da produção rural", holders: 1 },
];

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
    { id: "pedidos-sda", label: "Aprovações", icon: "request" },
    { id: "habilitacao", label: "Gestão de estocadores", icon: "users" },
    { id: "numeracao", label: "Gestão de numeração", icon: "hash" },
    { id: "automacoes", label: "Automações de geração", icon: "document" },
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
    "Gestão de estocadores",
    "Habilite pessoas físicas e jurídicas como estocadores, gerencie atendentes e os perfis com suas regras de fluxo.",
  ],
  "pedidos-sda": [
    "Aprovações da SEAPI",
    "Pedidos de brincos e movimentações com aprovação aguardando decisão — aprovar executa a movimentação; recusar registra o motivo.",
  ],
  numeracao: ["Gestão de numeração", "Controle as faixas emitidas pelo PNIB ou internamente."],
  automacoes: [
    "Automações de geração",
    "Configure quando e como o sistema gera faixas automaticamente — origem PNIB ou interna, tipo e atores atendidos.",
  ],
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
    start: "076210077200001",
    end: "076210077200240",
    qty: 240,
    status: "Disponível",
    source: "Recebido em 16/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200241",
    end: "076210077200330",
    qty: 90,
    status: "Disponível",
    source: "Recebido em 02/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200331",
    end: "076210077200365",
    qty: 35,
    status: "Disponível",
    source: "Recebido em 20/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200366",
    end: "076210077200370",
    qty: 5,
    status: "Disponível",
    source: "Devolvido em 05/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200381",
    end: "076210077200415",
    qty: 35,
    status: "Disponível",
    source: "Recebido em 20/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200453",
    end: "076210077200520",
    qty: 68,
    status: "Disponível",
    source: "Recebido em 20/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
];

const producerStock = [
  {
    start: "076210077200371",
    end: "076210077200375",
    qty: 5,
    status: "Disponível",
    source: "Compra em 28/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200376",
    end: "076210077200380",
    qty: 5,
    status: "Usado",
    source: "Compra em 28/05/2025",
    fabricante: "Identifica Brasil S.A.",
  },
  {
    start: "076210077200441",
    end: "076210077200452",
    qty: 12,
    status: "Disponível",
    source: "Compra em 14/06/2025",
    fabricante: "Identifica Brasil S.A.",
  },
];
// Espalhamento das faixas nos titulares — pedaços de cada faixa e onde estão (Opção 3, estado único)
const faixaPieces: Record<string, { titular: string; s1: string; s2: string; qty: number; note: string }[]> = {
  "105430057001001": [
    { titular: "Prefeitura Municipal de Bagé", s1: "105430057001001", s2: "105430057001400", qty: 400, note: "herdada" },
    { titular: "Antônio C. Silveira", s1: "105430057001401", s2: "105430057001500", qty: 100, note: "herdada" },
  ],
  "076210077200001": [
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200001", s2: "076210077200240", qty: 240, note: "recebida 16/06" },
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200241", s2: "076210077200330", qty: 90, note: "recebida 02/06" },
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200331", s2: "076210077200365", qty: 35, note: "recebida 20/05" },
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200366", s2: "076210077200370", qty: 5, note: "devolvida pelo produtor 05/06" },
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200381", s2: "076210077200415", qty: 35, note: "recebida 20/05" },
    { titular: "Agropecuária Pampa Sul Ltda.", s1: "076210077200453", s2: "076210077200520", qty: 68, note: "recebida 20/05" },
    { titular: "João Pedro Fagundes", s1: "076210077200371", s2: "076210077200375", qty: 5, note: "vendida 28/05" },
    { titular: "João Pedro Fagundes", s1: "076210077200376", s2: "076210077200380", qty: 5, note: "vendida 28/05 (aplicados)" },
    { titular: "João Pedro Fagundes", s1: "076210077200441", s2: "076210077200452", qty: 12, note: "vendida 14/06" },
    { titular: "Antônio C. Silveira", s1: "076210077200421", s2: "076210077200440", qty: 20, note: "transferida 12/06" },
  ],
  "076210077220001": [
    { titular: "Prefeitura Municipal de Bagé", s1: "076210077220001", s2: "076210077220400", qty: 400, note: "distribuída 12/05" },
    { titular: "Prefeitura Municipal de Bagé", s1: "076210077220401", s2: "076210077220560", qty: 160, note: "distribuída 28/05" },
  ],
  "105430057000001": [
    { titular: "Depósito central SEAPI", s1: "105430057000501", s2: "105430057001100", qty: 600, note: "recebida 03/06" },
    { titular: "Depósito central SEAPI", s1: "105430057001101", s2: "105430057001300", qty: 200, note: "recebida 05/06" },
    { titular: "Depósito central SEAPI", s1: "105430057006001", s2: "105430057006400", qty: 400, note: "recebida 09/06" },
  ],
};

const numberingRanges = [
  { start: "105430057001001", end: "105430057001500", qty: 500, tipo: "SISBOV", origem: "Interna", situacao: "Distribuída", destino: "Brinco Sul Indústria", dataCadastro: "18/01/2024", fonteInterna: true, criadoPor: "Régua do programa (herdada)", modoGeracao: "Herdada" },
  { start: "076210077200001", end: "076210077210000", qty: 10000, tipo: "SISBOV", origem: "Interna", situacao: "Em distribuição", destino: "Identifica Brasil S.A.", dataCadastro: "02/03/2025", fonteInterna: true, criadoPor: "Geração automática — reposição de estoque", modoGeracao: "Automática" },
  { start: "076210077220001", end: "076210077226000", qty: 6000, tipo: "SISBOV", origem: "Interna", situacao: "Em distribuição", destino: "Prefeitura Municipal de Bagé", dataCadastro: "05/05/2025", fonteInterna: true, criadoPor: "Ana R. Farias — SEAPI", modoGeracao: "Manual" },
  { start: "105430057000001", end: "105430057006000", qty: 6000, tipo: "INTERNACIONAL", origem: "PNIB", situacao: "Em distribuição", destino: "Depósito central SEAPI", dataCadastro: "01/06/2025", fonteInterna: false, criadoPor: "Geração automática — PNIB", modoGeracao: "Automática" },
  { start: "105430057010001", end: "105430057014000", qty: 4000, tipo: "INTERNACIONAL", origem: "Interna", situacao: "Disponível", destino: null, dataCadastro: "12/06/2025", fonteInterna: true, criadoPor: "Carlos M. Duarte — SEAPI", modoGeracao: "Manual" },
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
    items: "076210077200001 a 076210077200240",
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
    items: "076210077200441 a 076210077200452",
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
    items: "076210077200421 a 076210077200440",
  },
  {
    id: 1829,
    date: "10/06/2025",
    time: "11:41",
    type: "Perda",
    from: "Agropecuária Pampa Sul",
    to: "—",
    qty: 5,
    read: "Unitária",
    state: "Concluído",
    used: false,
    items: "076210077200416 a 076210077200420",
  },
  {
    id: 1815,
    date: "05/06/2025",
    time: "10:22",
    type: "Devolução",
    from: "João Pedro Fagundes",
    to: "Agropecuária Pampa Sul",
    qty: 5,
    read: "Sistema",
    state: "Concluído",
    used: false,
    items: "076210077200366 a 076210077200370",
    link: "#MOV-2025-1791",
  },
  {
    id: 1808,
    date: "03/06/2025",
    time: "17:05",
    type: "Saída interna",
    from: "Agropecuária Pampa Sul",
    to: "—",
    qty: 4,
    read: "Sistema",
    state: "Concluído",
    used: false,
    items: "076210077200381 a 076210077200384",
  },
  {
    id: 1800,
    date: "01/06/2025",
    time: "09:47",
    type: "Estorno",
    from: "SEAPI — fiscal estadual",
    to: "Agropecuária Pampa Sul",
    qty: 20,
    read: "Sistema",
    state: "Concluído",
    used: false,
    items: "076210077220401 a 076210077220420",
  },
  {
    id: 1806,
    date: "02/06/2025",
    time: "11:12",
    type: "Recebimento",
    from: "Identifica Brasil S.A.",
    to: "Agropecuária Pampa Sul",
    qty: 90,
    read: "2 códigos/caixa",
    state: "Concluído",
    used: false,
    items: "076210077200241 a 076210077200330",
  },
  {
    id: 1791,
    date: "28/05/2025",
    time: "15:40",
    type: "Venda",
    from: "Agropecuária Pampa Sul",
    to: "João Pedro Fagundes",
    qty: 15,
    read: "Unitária",
    state: "Concluído",
    used: false,
    items: "076210077200366 a 076210077200380",
  },
  {
    id: 1780,
    date: "20/05/2025",
    time: "09:05",
    type: "Recebimento",
    from: "Identifica Brasil S.A.",
    to: "Agropecuária Pampa Sul",
    qty: 190,
    read: "2 códigos/caixa",
    state: "Concluído",
    used: false,
    items: "076210077200331 a 076210077200520",
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
  const isPedidoSdaDetailPage =
    pathSegments.length === 3 &&
    pathSegments[1] === "pedidos-sda" &&
    /^\d+$/.test(pathSegments[2] ?? "");
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
  const isEstocadoresSubPage =
    page === "habilitacao" &&
    pathSegments.length === 3 &&
    (pathSegments[2] === "dashboard" ||
      pathSegments[2] === "novo" ||
      pathSegments[2] === "regras" ||
      pathSegments[2] === "auditoria" ||
      pathSegments[2] === "estocador-auditoria");
  const isFaixaAuditoriaPage =
    page === "numeracao" && pathSegments.length === 4 && pathSegments[3] === "auditoria";
  const isAutomacoesAuditoriaPage =
    page === "automacoes" && pathSegments.length === 3 && pathSegments[2] === "auditoria";
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
  const [perfis, setPerfis] = useState<PerfilCatalogo[]>(PERFIS_INICIAIS);
  const [regras, setRegras] = useState(perfilRulesSeed);
  const [auditoriaMatriz, setAuditoriaMatriz] = useState<AuditoriaMatrizRow[]>(AUDITORIA_SEED);
  const [auditoriaAutomacoes, setAuditoriaAutomacoes] = useState(auditoriaAutomacoesSeed);
  const [auditoriaEstocadores, setAuditoriaEstocadores] = useState(auditoriaEstocadoresSeed);
  const [moves, setMoves] = useState(initialMoves);
  const [requests, setRequests] = useState<RequestRecord[]>(initialRequests);
  const [pedidosSda, setPedidosSda] = useState<PedidoSda[]>(pedidosSdaSeed);
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
      !isPedidoSdaDetailPage &&
      !isRangeDetailPage &&
      !isNumeracaoDashboard &&
      !isEstocadoresSubPage &&
      !isFaixaAuditoriaPage &&
      !isAutomacoesAuditoriaPage
    ) {
      navigate(canonicalPath, { replace: true });
    }
  }, [
    isAutomacoesAuditoriaPage,
    isEstocadoresSubPage,
    isFaixaAuditoriaPage,
    isMovementItemsPage,
    isPedidoSdaDetailPage,
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
          {nav[role]
            .filter((item) => !(role === "seapi" && item.id === "automacoes"))
            .map((item) => (
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
        {!isTagDetailPage && !isNumeracaoDashboard && !isPedidoSdaDetailPage && (
          <div className="page-heading">
            <div>
              <div className="breadcrumb">
                Início <span>/</span>
                {isMovementItemsPage ? (
                  <>
                    <Link to={`/${role}/historico`}>Movimentações</Link>
                    <span>/</span> Itens
                  </>
                ) : isPedidoSdaDetailPage ? (
                  <>
                    <Link to={`/${role}/pedidos-sda`}>Aprovações</Link>
                    <span>/</span> Detalhes
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
                    items: "076210077200001 a 076210077200240",
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
              pedidosSda,
              setPedidosSda,
              perfis,
              setPerfis,
              regras,
              setRegras,
              auditoriaMatriz,
              registraAuditoria: (entry: AuditoriaMatrizRow) =>
                setAuditoriaMatriz((current) => [entry, ...current]),
              auditoriaAutomacoes,
              registraEventoAutomacao: (id: number, alvo: string, evento: string, detalhe?: string) =>
                setAuditoriaAutomacoes((current) => ({
                  ...current,
                  [id]: [
                    { quando: agoraAuditoria(), usuario: "seapi.fiscal", evento, detalhe, alvo },
                    ...(current[id] ?? []),
                  ],
                })),
              auditoriaEstocadores,
              registraEventoEstocador: (nome: string, evento: string, detalhe?: string) =>
                setAuditoriaEstocadores((current) => ({
                  ...current,
                  [nome]: [
                    { quando: agoraAuditoria(), usuario: "seapi.fiscal", evento, detalhe },
                    ...(current[nome] ?? []),
                  ],
                })),
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
                items: "076210077200381 a 076210077200392",
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
    case "habilitacao": {
      const sub = window.location.pathname.split("/").pop();
      if (sub === "auditoria")
        return <AuditoriaRegrasPage role={context.role} auditoriaMatriz={context.auditoriaMatriz} />;
      if (sub === "dashboard")
        return (
          <EstocadoresDashboard
            role={context.role}
            perfis={context.perfis}
            auditoriaMatriz={context.auditoriaMatriz}
          />
        );
      if (sub === "novo") return <HabilitacaoNovoPage notify={context.notify} role={context.role} perfis={context.perfis} regras={context.regras} />;
      if (sub === "regras")
        return (
          <EstocadoresRegrasPage
            notify={context.notify}
            role={context.role}
            perfis={context.perfis}
            setPerfis={context.setPerfis}
            regras={context.regras}
            setRegras={context.setRegras}
            registraAuditoria={context.registraAuditoria}
          />
        );
      if (sub === "estocador-auditoria")
        return (
          <AuditoriaEstocadorPage
            role={context.role}
            auditoriaEstocadores={context.auditoriaEstocadores}
          />
        );
      return (
        <EstocadoresPage
          notify={context.notify}
          role={context.role}
          auditoriaEstocadores={context.auditoriaEstocadores}
          registraEventoEstocador={context.registraEventoEstocador}
        />
      );
    }
    case "pedidos-sda":
      return (
        <PedidosSdaPage
          notify={context.notify}
          pedidos={context.pedidosSda}
          setPedidos={context.setPedidosSda}
        />
      );
    case "pedidos-sda-novo":
      return <PedidoSdaFormPage notify={context.notify} role={context.role} />;
    case "numeracao":
      if (isNumeracaoDashboard) {
        return <NumberingDashboard role={context.role} />;
      }
      return <NumberingPage notify={context.notify} role={context.role} />;
    case "automacoes": {
      const sub = window.location.pathname.split("/").pop();
      if (sub === "auditoria")
        return (
          <AuditoriaAutomacoesPage
            role={context.role}
            auditoriaAutomacoes={context.auditoriaAutomacoes}
          />
        );
      return (
        <AutomacoesPage
          notify={context.notify}
          role={context.role}
          auditoriaAutomacoes={context.auditoriaAutomacoes}
          registraEventoAutomacao={context.registraEventoAutomacao}
        />
      );
    }
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

  const firstNumber = movement.items.match(/\d{15}/)?.[0] ?? "076210077200001";
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

type RegistroAuditoria = {
  quando: string;
  usuario: string;
  evento: string;
  detalhe?: string;
  alvo?: string;
};

const agoraAuditoria = () =>
  new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const dataDe = (texto: string) => texto.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] ?? "—";

// Bloco de auditoria reutilizável — histórico imutável de uma entidade (estocador, faixa, automação)
function BlocoAuditoria({
  registros,
  titulo = "Auditoria",
  subtitulo = "Do evento mais recente para o mais antigo",
}: {
  registros: RegistroAuditoria[];
  titulo?: string;
  subtitulo?: string;
}) {
  return (
    <section className="panel audit-block-panel">
      <div className="panel-head">
        <div>
          <h2>{titulo}</h2>
          <p>{subtitulo}</p>
        </div>
        <span className="head-badge">{registros.length} registros</span>
      </div>
      {registros.length === 0 ? (
        <p className="aging-note" style={{ padding: "0 20px 14px" }}>
          Nenhum evento registrado.
        </p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Usuário</th>
              <th>Evento</th>
              <th>Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {registros.map((r, i) => (
              <tr key={i}>
                <td>{r.quando}</td>
                <td>{r.usuario}</td>
                <td>{r.evento}</td>
                <td>{r.detalhe ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
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
        <Link
          className="btn secondary"
          to={`/${context.role}/numeracao/${range.start}/auditoria`}
        >
          <Icon name="history" size={15} /> Auditoria da faixa
        </Link>
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
              <div>
                <dt>Gerado por</dt>
                <dd>{range.criadoPor}</dd>
              </div>
              <div>
                <dt>Modo de geração</dt>
                <dd>{range.modoGeracao}</dd>
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
                <dt>Brincos distribuídos</dt>
                <dd>
                  {(faixaPieces[range.start] ?? [])
                    .reduce((n, p) => n + p.qty, 0)
                    .toLocaleString("pt-BR")}{" "}
                  de {range.qty.toLocaleString("pt-BR")}
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

      <section className="panel faixa-pieces-panel">
          <div className="panel-head">
            <div>
              <h2>Brincos por titular</h2>
              <p>Os brincos desta faixa e o titular de cada bloco</p>
            </div>
            <Badge tone="purple">
              {(faixaPieces[range.start] ?? []).length} pedaços
            </Badge>
          </div>
          {(faixaPieces[range.start] ?? []).length > 0 ? (
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Titular</th>
                    <th>Intervalo</th>
                    <th>Brincos</th>
                    <th>Origem da posse</th>
                  </tr>
                </thead>
                <tbody>
                  {(faixaPieces[range.start] ?? []).map((p, i) => (
                    <tr key={i}>
                      <td>
                        <strong>{p.titular}</strong>
                      </td>
                      <td>
                        {formatTag(p.s1)} a {formatTag(p.s2)}
                      </td>
                      <td>
                        <strong>{p.qty.toLocaleString("pt-BR")}</strong>
                      </td>
                      <td>{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="pieces-empty">
              Faixa íntegra no estoque central — sem espalhamento entre titulares.
            </p>
          )}
        </section>

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
                    : "Faixa interna gerada pela SDA"}
                </h4>
                <p>
                  Gerada por {range.criadoPor}
                  {range.modoGeracao !== "Herdada" && ` (${range.modoGeracao.toLowerCase()})`} ·{" "}
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
  const [buscaEstoque, setBuscaEstoque] = useState("");
  const [situacaoEstoque, setSituacaoEstoque] = useState("Todas as situações");
  const [holder, setHolder] = useState("Agropecuária Pampa Sul Ltda.");
  const isLegado = role === "seapi" && holder.startsWith("Prefeitura Municipal de Bagé");
  const [view, setView] = useState<"titulares" | "detalhe">("titulares");
  const showDetail = !(role === "seapi" && view === "titulares");
  const [holderStocks, setHolderStocks] = useState([
    {
      select: "Agropecuária Pampa Sul Ltda.",
      titular: "Agropecuária Pampa Sul Ltda.",
      perfil: "PJ · LOJA_AGROPECUARIA",
      canal: "NOVO",
      ranges: 3,
      brincos: 350,
    },
    {
      select: "Antônio Carlos Silveira — PF",
      titular: "Antônio Carlos Silveira",
      perfil: "PF · HABILITADO",
      canal: "NOVO",
      ranges: 2,
      brincos: 120,
    },
    {
      select: "João Pedro Fagundes — Produtor",
      titular: "João Pedro Fagundes",
      perfil: "PRODUTOR",
      canal: "NOVO",
      ranges: 2,
      brincos: 15,
    },
    {
      select: "Prefeitura Municipal de Bagé — Portal legado",
      titular: "Prefeitura Municipal de Bagé",
      perfil: "PREFEITURA",
      canal: "PORTAL",
      ranges: 4,
      brincos: 960,
    },
    {
      select: "Depósito central SEAPI",
      titular: "Depósito central SEAPI",
      perfil: "ESTOQUE_SDA",
      canal: "NOVO",
      ranges: 3,
      brincos: 1200,
    },
  ]);
  const ligarAtor = (sel) =>
    setHolderStocks((list) =>
      list.map((h) => (h.select === sel ? { ...h, canal: "NOVO" } : h)),
    );
  const custodiaTotal = holderStocks.reduce((n, h) => n + h.brincos, 0);
  const legadoBrincos = holderStocks
    .filter((h) => h.canal === "PORTAL")
    .reduce((n, h) => n + h.brincos, 0);
  const subFaixasTotal = holderStocks.reduce((n, h) => n + h.ranges, 0);
  const stocks = role === "produtor" ? producerStock : stockBase;
  const stocksFiltrados = stocks.filter((s) => {
    if (situacaoEstoque !== "Todas as situações" && s.status !== situacaoEstoque) return false;
    const q = buscaEstoque.trim().toLowerCase();
    if (q && !`${s.start} ${s.end} ${s.fabricante}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const total =
    stocks.reduce((n, s) => n + s.qty, 0) + (role === "produtor" ? producerAdded.length : 0);
  const itemRows = [
    "076210077200301",
    "076210077200302",
    "076210077200303",
    "076210077200304",
    "076210077200305",
    "076210077200306",
  ];
  const itensFiltrados = itemRows.filter((c) =>
    c.toLowerCase().includes(buscaEstoque.trim().toLowerCase()),
  );
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
              <option>Prefeitura Municipal de Bagé — Portal legado</option>
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
            <strong>Titular ainda operando pelo portal legado · somente consulta aqui</strong>
            <span>
              O estoque dele é o mesmo registro do novo (estado único). As movimentações de
              brincos do titular continuam no portal até a ligação — quando a SEAPI ativa o
              acesso dele aqui.
            </span>
          </div>
        </div>
      )}
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
                  <th>Canal de operação</th>
                  <th>Blocos de brincos</th>
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
                      <Badge tone={h.canal === "NOVO" ? "blue" : "neutral"}>
                        {h.canal === "NOVO" ? "Ligado no novo" : "Portal legado"}
                      </Badge>
                    </td>
                    <td>{h.ranges}</td>
                    <td>
                      <strong>{h.brincos.toLocaleString("pt-BR")}</strong>
                    </td>
                    <td>
                      <div className="action-cell">
                        <button
                          className="btn secondary"
                          onClick={() => {
                            setHolder(h.select);
                            setView("detalhe");
                          }}
                        >
                          <Icon name="eye" size={15} /> Abrir estoque
                        </button>
                        {h.canal === "PORTAL" && (
                          <button className="btn secondary" onClick={() => ligarAtor(h.select)}>
                            <Icon name="zap" size={15} /> Ligar no novo
                          </button>
                        )}
                      </div>
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
            <input
              placeholder="Buscar numeração ou fabricante..."
              value={buscaEstoque}
              onChange={(e) => setBuscaEstoque(e.target.value)}
            />
          </div>
          <select value={situacaoEstoque} onChange={(e) => setSituacaoEstoque(e.target.value)}>
            <option>Todas as situações</option>
            <option>Disponível</option>
            <option>Usado</option>
          </select>
          <span className="result-count">
            {mode === "range"
              ? `${stocksFiltrados.length} de ${stocks.length} faixas`
              : `${itensFiltrados.length} de ${itemRows.length} brincos`}
          </span>
        </div>
        {mode === "range" ? (
          <div className="range-list">
            {stocksFiltrados.map((s, i) => (
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
                {itensFiltrados.map((tag) => (
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
                <button onClick={() => setStartCode("076210077200001")}>Simular</button>
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
                <button onClick={() => setEndCode("076210077200240")}>Simular</button>
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
                            box.start === "076210077200001" && box.end === "076210077200240"
                              ? "green"
                              : "red"
                          }
                        >
                          {box.start === "076210077200001" && box.end === "076210077200240"
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
              <Icon name="alert" /> Ao confirmar, os brincos das caixas lidas serão creditados no
              seu estoque, com o vínculo da faixa e da fábrica de origem.
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
        <strong>Identifica Brasil S.A.</strong>
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
          <strong>{formatTag("076210077200001")}</strong>
          <i>até</i>
          <strong>{formatTag("076210077200240")}</strong>
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
      start: "076210077200001",
      end: "076210077200240",
      received: "16/06/2025",
    },
    {
      id: "FX-002",
      start: "076210077200241",
      end: "076210077200330",
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
                    ? "Composição exclusivamente por leitura de código de barras — seleção manual não é permitida."
                    : "Leia o código de barras da caixa (início + fim) — a seleção manual de faixas não é permitida."}
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
  const [buscaMov, setBuscaMov] = useState("");
  const [tipoMov, setTipoMov] = useState("Todos os tipos");
  const [periodoMov, setPeriodoMov] = useState("TODOS");
  const tiposDistintos = [...new Set(moves.map((m) => m.type))];
  const referenciaDemo = new Date(2025, 5, 18);
  const rows = moves.filter((m) => {
    if (tipoMov !== "Todos os tipos" && m.type !== tipoMov) return false;
    if (periodoMov !== "TODOS") {
      const [dd, mm, aa] = m.date.split("/").map(Number);
      const diff = Math.round((referenciaDemo.getTime() - new Date(aa, mm - 1, dd).getTime()) / 86400000);
      if (diff > Number(periodoMov)) return false;
    }
    const q = buscaMov.trim().toLowerCase();
    if (q && !`${m.from} ${m.to} ${m.type} ${m.items ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  return (
    <div className="page-container">
      <section className="header">
        <h3>Movimentações de custódia</h3>
      </section>
      <form className="filters-card" onSubmit={(e) => e.preventDefault()}>
        <div className="filters-body">
          <div className="filter-row filter-row--full">
            <div className="search-field filter-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                placeholder="Buscar por origem, destino, movimento ou numeração..."
                value={buscaMov}
                onChange={(e) => setBuscaMov(e.target.value)}
              />
            </div>
          </div>
          <div className="filter-row">
            <select className="filter-field" value={tipoMov} onChange={(e) => setTipoMov(e.target.value)}>
              <option>Todos os tipos</option>
              {tiposDistintos.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <select className="filter-field" value={periodoMov} onChange={(e) => setPeriodoMov(e.target.value)}>
              <option value="TODOS">Todo o período</option>
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>
        </div>
      </form>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Origem</th>
              <th>Destino</th>
              <th>Qtd.</th>
              <th>Situação</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <span className="aging-note" style={{ display: "block", padding: "12px 16px" }}>
                    Nenhuma movimentação para o recorte selecionado — ajuste os filtros ou limpe a busca.
                  </span>
                </td>
              </tr>
            )}
            {rows.map((m) => (
              <Fragment key={m.id}>
                <tr className={expanded === m.id ? "expanded-row" : ""}>
                  <td>
                    {m.date}
                    <small>{m.time}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        m.type === "Perda"
                          ? "red"
                          : m.type === "Devolução"
                            ? "purple"
                            : m.type === "Venda"
                              ? "blue"
                              : "neutral"
                      }
                    >
                      {m.type}
                    </Badge>
                  </td>
                  <td>
                    <strong>{m.from}</strong>
                  </td>
                  <td>{m.to}</td>
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
        <span>Exibindo {rows.length} de {moves.length} movimentações</span>
        <div className="pagination">
          <button disabled>‹</button>
          <button className="current">1</button>
          <button>2</button>
          <button>›</button>
        </div>
      </div>
    </div>
  );
}

type Estocador = {
  name: string;
  doc: string;
  city: string;
  type: "PJ" | "PF";
  active: boolean;
  canal: "NOVO" | "HERDADO";
  perfil: string;
  origem: string;
  ligadoEm: string | null;
  atendentes: number;
};

// RN-001 (CR-003/ADR-012): habilitação constitutiva do cadastro; carga inicial de identidade traz os estocadores já habilitados.
// RN-013 emendada (CR-012/ADR-025): sem regimes — canal de operação (ligado no novo × portal herdado) sobre o estado único.
const estocadoresBase: Estocador[] = [
  {
    name: "Agropecuária Pampa Sul Ltda.",
    doc: "CNPJ 92.841.760/0001-08",
    city: "Bagé/RS",
    type: "PJ",
    active: true,
    canal: "NOVO",
    perfil: "LOJA_AGROPECUARIA",
    origem: "Habilitado pela SEAPI em 02/03/2025",
    ligadoEm: "02/03/2025",
    atendentes: 2,
  },
  {
    name: "Comercial Rural Tradição Ltda.",
    doc: "CNPJ 04.228.195/0001-62",
    city: "Cruz Alta/RS",
    type: "PJ",
    active: true,
    canal: "HERDADO",
    perfil: "LOJA_AGROPECUARIA",
    origem: "Carga inicial de identidade — 01/05/2025",
    ligadoEm: null,
    atendentes: 0,
  },
  {
    name: "Prefeitura Municipal de Bagé",
    doc: "CNPJ 85.987.342/0001-31",
    city: "Bagé/RS",
    type: "PJ",
    active: true,
    canal: "HERDADO",
    perfil: "PREFEITURA",
    origem: "Carga inicial de identidade — 01/05/2025",
    ligadoEm: null,
    atendentes: 0,
  },
  {
    name: "Cooperativa Agropecuária Vale do Verde",
    doc: "CNPJ 78.412.905/0001-44",
    city: "Ijuí/RS",
    type: "PJ",
    active: true,
    canal: "HERDADO",
    perfil: "COOPERATIVA_LEITE",
    origem: "Carga inicial de identidade — 01/05/2025",
    ligadoEm: null,
    atendentes: 0,
  },
  {
    name: "Antônio Carlos Silveira",
    doc: "CPF 318.***.***-02",
    city: "Alegrete/RS",
    type: "PF",
    active: true,
    canal: "NOVO",
    perfil: "CREDENCIADO",
    origem: "Carga inicial de identidade — 01/05/2025",
    ligadoEm: "02/06/2025",
    atendentes: 0,
  },
  {
    name: "Paulo Renato Dornelles",
    doc: "CPF 701.***.***-44",
    city: "São Borja/RS",
    type: "PF",
    active: false,
    canal: "NOVO",
    perfil: "CREDENCIADO",
    origem: "Habilitado pela SEAPI em 18/06/2025",
    ligadoEm: "18/06/2025",
    atendentes: 0,
  },
];

// Auditoria por estocador — seed derivado do cadastro; eventos ao vivo entram quando a SEAPI age
const auditoriaEstocadoresSeed: Record<string, RegistroAuditoria[]> = {};
for (const est of estocadoresBase) {
  const eventos: RegistroAuditoria[] = [];
  if (!est.active) {
    eventos.unshift({
      quando: "—",
      usuario: "seapi.fiscal",
      evento: "Suspenso",
      detalhe: "situação atual do titular",
    });
  }
  if (est.name === "Agropecuária Pampa Sul Ltda.") {
    eventos.unshift({
      quando: "—",
      usuario: "seapi.fiscal",
      evento: "Atendente habilitado",
      detalhe: "Luiz Carlos Prestes — vínculo por CPF",
    });
    eventos.unshift({
      quando: "—",
      usuario: "seapi.fiscal",
      evento: "Atendente habilitado",
      detalhe: "Mariana Teixeira Oliveira — vínculo por CPF",
    });
  }
  if (est.canal === "NOVO") {
    eventos.unshift({
      quando: est.ligadoEm ?? "—",
      usuario: "seapi.fiscal",
      evento: "Ligado no novo",
      detalhe: "acesso no Portal herdado bloqueado",
    });
  }
  eventos.unshift({
    quando: dataDe(est.origem),
    usuario: "seapi.fiscal",
    evento: "Habilitado no cadastro",
    detalhe: est.origem,
  });
  auditoriaEstocadoresSeed[est.name] = eventos;
}

const perfilOptions = ["LOJA_AGROPECUARIA", "CREDENCIADO", "PREFEITURA", "COOPERATIVA_LEITE", "INSPETORIA", "POSTO"];

// Rótulos de exibição por perfil (decisão do operador 25/11/2026 — ADR-026): o código canônico do banco
// (tabela SDA_CREDENCIADO do legado) permanece CREDENCIADO; a UI mostra "Habilitado".
const perfilLabel: Record<string, string> = {
  CREDENCIADO: "Habilitado",
  LOJA_AGROPECUARIA: "Loja Agropecuária",
  PREFEITURA: "Prefeitura",
  COOPERATIVA_LEITE: "Cooperativa de Leite",
  INSPETORIA: "Inspetoria de Defesa Agropecuária (IDA)",
  POSTO: "Escritório de Defesa Agropecuária (EDA)",
  SEAPI: "SEAPI",
  FABRICA: "Fábrica de brincos",
  PRODUTOR: "Produtor",
};
function labelPerfil(code: string) {
  return perfilLabel[code] ?? code;
}
const perfilMovimentos = ["Abastecimento", "Venda", "Transferência", "Devolução", "Perda", "Saída interna", "Estorno"];

type RegraFluxo = {
  tipo: "LIVRE" | "BLOQUEIO" | "ESCOPO";
  alvos?: string[];
  aprovacao?: { aprovador: "SEAPI" | "DESTINO" } | null;
};

// Atores autorizáveis no escopo de uma regra (RN-012) — seleção múltipla.
// Perfis = classes de estocadores habilitáveis; titulares fixos = atores de estado sempre existentes:
// produtores entram pela compra (RN-001/ADR-012), fábricas atendem produção (RN-003), estoque central
// SDA é a origem única dos pedidos (RN-014 — equivale ao estoque SEAPA do legado, PEND-MONO-560).
const escopoAtores: { id: string; label: string }[] = [
  { id: "CREDENCIADO", label: "Habilitado" },
  { id: "LOJA_AGROPECUARIA", label: "Lojas agropecuárias" },
  { id: "PREFEITURA", label: "Prefeituras" },
  { id: "COOPERATIVA_LEITE", label: "Cooperativas de leite" },
  { id: "INSPETORIA", label: "Inspetoria de Defesa Agropecuária (IDA)" },
  { id: "POSTO", label: "Escritório de Defesa Agropecuária (EDA)" },
  { id: "PRODUTOR", label: "Produtores rurais" },
  { id: "FABRICA", label: "Fábricas de brincos" },
  { id: "ESTOQUE_SDA", label: "SEAPI" },
];

// Postura padrão (RN-012): sem restrição registrada = fluxo livre com qualquer titular
function perfilRulesSeed(): Record<string, Record<string, { origem: RegraFluxo; destino: RegraFluxo }>> {
  const base: Record<string, Record<string, { origem: RegraFluxo; destino: RegraFluxo }>> = {};
  for (const code of [...perfilOptions, "SEAPI", "FABRICA", "PRODUTOR"]) {
    base[code] = {};
    for (const movement of perfilMovimentos) {
      base[code][movement] = { origem: { tipo: "LIVRE" }, destino: { tipo: "LIVRE" } };
    }
  }
  // ABASTECIMENTO (RN-003): a origem do abastecimento é a fábrica (sem perfil) — nenhum estocador abastece
  for (const code of [...perfilOptions, "SEAPI", "PRODUTOR"]) {
    base[code]["Abastecimento"].origem = { tipo: "BLOQUEIO" };
  }
  // PRODUTOR: não abastece nem recebe abastecimento direto — brincos chegam por venda (RN-006) ou transferência
  base["PRODUTOR"]["Abastecimento"] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "BLOQUEIO" } };
  // VENDA é a venda ao produtor (RN-006, leitura obrigatória — RN-015): executada por Habilitado e Loja Agropecuária;
  // os órgãos (Prefeitura/Cooperativa/IDA/Posto/SEAPI) não vendem nem compram brincos
  for (const code of ["PREFEITURA", "COOPERATIVA_LEITE", "INSPETORIA", "POSTO", "SEAPI"]) {
    base[code]["Venda"] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "BLOQUEIO" } };
  }
  // PRODUTOR: recebe venda com crédito imediato (RN-006 — sem aprovação) e não vende
  base["PRODUTOR"]["Venda"] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "LIVRE" } };
  // TRANSFERÊNCIA entre estocadores: livre; o produtor só recebe (RN-005 cobre a devolução dele)
  base["PRODUTOR"]["Transferência"].origem = { tipo: "BLOQUEIO" };
  // DEVOLUÇÃO/PERDA/SAÍDA INTERNA: operações de estocador — o produtor não executa
  for (const movement of ["Devolução", "Perda", "Saída interna"]) {
    base["PRODUTOR"][movement] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "BLOQUEIO" } };
  }
  // Escopo do legado (CAND-MONO-601): prefeitura e cooperativa remetem só a credenciados
  base["PREFEITURA"]["Transferência"].destino = { tipo: "ESCOPO", alvos: ["CREDENCIADO"] };
  base["COOPERATIVA_LEITE"]["Transferência"].destino = { tipo: "ESCOPO", alvos: ["CREDENCIADO"] };
  // ESTORNO (RN-005): exclusivo da SEAPI
  for (const code of [...perfilOptions, "SEAPI", "FABRICA", "PRODUTOR"]) {
    base[code]["Estorno"] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "BLOQUEIO" } };
  }
  base["SEAPI"]["Estorno"].destino = { tipo: "LIVRE" };
  // FABRICA (RN-003): produz e declara o envio (a origem do abastecimento) — não movimenta brincos
  base["FABRICA"]["Abastecimento"] = { origem: { tipo: "LIVRE" }, destino: { tipo: "BLOQUEIO" } };
  for (const movement of ["Venda", "Transferência", "Devolução", "Perda", "Saída interna", "Estorno"]) {
    base["FABRICA"][movement] = { origem: { tipo: "BLOQUEIO" }, destino: { tipo: "BLOQUEIO" } };
  }
  return base;
}

// Semântica da matriz (RN-012): "Não aplicável" SÓ para impossibilidade conceitual — a natureza do
// movimento não tem destinatário. Todo o resto é política de negócio: configurável pela SEAPI,
// com o seed restritivo como ponto de partida editável (governança da matriz).
function celulaNaoAplicavel(perfil: string, movement: string, side: "origem" | "destino"): string | null {
  // PERDA / SAÍDA INTERNA não têm destinatário — é uma saída na posse do titular; não existe "receber"
  if ((movement === "Perda" || movement === "Saída interna") && side === "destino")
    return "Não tem destinatário — o movimento é uma saída na posse do titular. Não existe \"receber\".";
  return null;
}

// Rótulo legível de uma restrição — usado no histórico de auditoria da matriz (RN-029)
function regraLabel(r: RegraFluxo): string {
  if (r.tipo === "BLOQUEIO") return "Bloqueado";
  const base =
    r.tipo === "ESCOPO"
      ? `Escopo · ${r.alvos?.length ?? 0} ${r.alvos?.length === 1 ? "ator" : "atores"}`
      : "Livre";
  return r.aprovacao
    ? `${base} · com aprovação (${r.aprovacao.aprovador === "SEAPI" ? "SEAPI" : "destinatário"})`
    : base;
}

function badgeRegraFluxo(regra: RegraFluxo) {
  if (regra.tipo === "BLOQUEIO") return <Badge tone="red">Bloqueio</Badge>;
  const partes: React.ReactNode[] = [];
  if (regra.tipo === "ESCOPO") {
    const n = regra.alvos?.length ?? 0;
    const labels = (regra.alvos ?? [])
      .map((a) => escopoAtores.find((x) => x.id === a)?.label ?? a)
      .join(" · ");
    partes.push(
      <span key="escopo" title={`Só com: ${labels}`}>
        <Badge tone="yellow">
          Escopo · {n} {n === 1 ? "ator" : "atores"}
        </Badge>
      </span>,
    );
  } else {
    partes.push(
      <Badge key="livre" tone="green">
        Livre
      </Badge>,
    );
  }
  if (regra.aprovacao) {
    const quem = regra.aprovacao.aprovador === "SEAPI" ? "a SEAPI" : "o próprio destinatário";
    partes.push(
      <span key="aprov" title={`Exige aprovação de ${quem} antes de executar`}>
        <Badge tone="blue">Com aprovação</Badge>
      </span>,
    );
  }
  return <span className="badge-combo">{partes}</span>;
}

// Definições de negócio dos movimentos — exibidas no tooltip "i" da matriz de regras.
// Mapeamento código (enum TP_MOVIMENTACAO) → rótulo: RECEBIMENTO → "Abastecimento"; demais mantêm o nome.
const movimentoDesc: Record<string, string> = {
  Abastecimento:
    "Brincos novos entrando no estoque: a entrada que dá início à custódia de cada brinco no sistema. Quem recebe confirma com a leitura do código de barras — nenhum brinco entra no sistema por outro caminho.",
  Venda:
    "Movimento comercial de brincos: quem compra assume a custódia no ato — a leitura do código de barras conclui a venda e o crédito é imediato, sem espera. A venda é definitiva: o comprador pode recusar ali mesmo e, depois, o brinco só volta por devolução.",
  Transferência:
    "O brinco muda de custódia entre dois estocadores, sem ser por venda: sai do estoque de quem envia e entra no de quem recebe, com leitura do código de barras dos dois lados.",
  Devolução:
    "O brinco volta para o estoque de onde saiu: desfaz uma venda ou transferência enquanto o brinco ainda não foi aplicado a um animal, e volta a ficar disponível no estoque de origem.",
  Perda:
    "O brinco se perdeu, foi extraviado ou inutilizado. Ele sai de circulação definitivamente, na posse de quem declarou — não existe \"receber\" uma perda. Fica registrado com justificativa na trilha do brinco.",
  "Saída interna":
    "O próprio titular consome o brinco — uso interno, amostra ou descarte administrativo. Sai do estoque sem destino a ninguém: não tem destinatário, apenas documentação obrigatória.",
  Estorno:
    "Correção de erro: desfaz uma movimentação já executada (ex.: transferência registrada por engano) e devolve os brincos à custódia anterior. O rastro completo fica na trilha de auditoria.",
};

function InfoTip({ texto }: { texto: string }) {
  const [aberto, setAberto] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLSpanElement | null>(null);
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      const alvo = e.target as HTMLElement;
      if (ref.current && !ref.current.contains(alvo) && !alvo.closest(".info-tip-pop")) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);
  function abrir() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      const top = rect.bottom + 8;
      const left = Math.max(8, Math.min(rect.left - 12, window.innerWidth - 272));
      setPos({ top, left });
    }
    setAberto(true);
  }
  return (
    <span className="info-tip" ref={ref}>
      <button
        type="button"
        className="info-tip-btn"
        aria-label="Entender este movimento"
        onClick={abrir}
      >
        i
      </button>
      {aberto &&
        createPortal(
          <span
            className="info-tip-pop"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            {texto}
          </span>,
          document.body
        )}
    </span>
  );
}

function EstocadoresPage({
  notify,
  role,
  auditoriaEstocadores,
  registraEventoEstocador,
}: {
  notify: (m: string) => void;
  role: Role;
  auditoriaEstocadores: Record<string, RegistroAuditoria[]>;
  registraEventoEstocador: (nome: string, evento: string, detalhe?: string) => void;
}) {
  const [holderList, setHolderList] = useState<Estocador[]>(estocadoresBase);
  const [searchH, setSearchH] = useState("");
  const [filterPerfilH, setFilterPerfilH] = useState("Todos os perfis");
  const [filterCanalH, setFilterCanalH] = useState("Todos os canais");
  const [filterSituacaoH, setFilterSituacaoH] = useState("Todas as situações");
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [ligar, setLigar] = useState<Estocador | null>(null);
  const [detalheNome, setDetalheNome] = useState<string | null>(null);
  const detalheAtual = detalheNome ? holderList.find((h) => h.name === detalheNome) ?? null : null;
  const rows = holderList.filter((h) => {
    if (filterPerfilH !== "Todos os perfis" && h.perfil !== filterPerfilH) return false;
    if (filterCanalH === "Ligado no novo" && h.canal !== "NOVO") return false;
    if (filterCanalH === "Portal herdado" && h.canal !== "HERDADO") return false;
    if (filterSituacaoH === "Ativos" && !h.active) return false;
    if (filterSituacaoH === "Suspensos" && h.active) return false;
    const q = searchH.trim().toLowerCase();
    if (q && !`${h.name} ${h.doc} ${h.city}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const activeFilterCount = [
    filterPerfilH !== "Todos os perfis",
    filterCanalH !== "Todos os canais",
    filterSituacaoH !== "Todas as situações",
    searchH.trim() !== "",
  ].filter(Boolean).length;
  function clearFilters() {
    setSearchH("");
    setFilterPerfilH("Todos os perfis");
    setFilterCanalH("Todos os canais");
    setFilterSituacaoH("Todas as situações");
  }
  function registraEventoLocal(nome: string, evento: string, detalhe?: string) {
    registraEventoEstocador(nome, evento, detalhe);
  }
  function ligarNoNovo(est: Estocador) {
    const hoje = new Date().toLocaleDateString("pt-BR");
    setHolderList((prev) =>
      prev.map((x) => (x.name === est.name ? { ...x, canal: "NOVO", ligadoEm: hoje } : x)),
    );
    registraEventoLocal(est.name, "Ligado no novo", "acesso no Portal herdado bloqueado");
    setLigar(null);
    notify(`${est.name} ligado no novo — acesso no Portal herdado bloqueado.`);
  }
  function toggleAtivo(est: Estocador) {
    setHolderList((prev) =>
      prev.map((x) => (x.name === est.name ? { ...x, active: !x.active } : x)),
    );
    registraEventoLocal(est.name, est.active ? "Suspenso" : "Reativado");
    notify(est.active ? "Estocador suspenso com sucesso." : "Estocador reativado com sucesso.");
  }
  function addAtendente(est: Estocador) {
    setHolderList((prev) =>
      prev.map((x) => (x.name === est.name ? { ...x, atendentes: x.atendentes + 1 } : x)),
    );
    registraEventoLocal(est.name, "Atendente habilitado", "vínculo por CPF");
    notify("Atendente habilitado e vinculado à pessoa jurídica.");
  }
  return (
    <div className="page-container">
      <section className="header">
        <h3>Estocadores habilitados</h3>
        <div className="header-actions">
          <Link className="text-btn muted-action chart-btn" to={`/${role}/habilitacao/dashboard`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/>
            </svg>
            Dashboard
          </Link>
          <Link className="text-btn muted-action chart-btn" to={`/${role}/habilitacao/regras`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Perfis e regras
          </Link>
          <div className="layout-toggle">
            <button className={`layout-btn ${viewMode === "list" ? "active" : ""}`} onClick={() => setViewMode("list")} aria-label="Visualização em lista">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button className={`layout-btn ${viewMode === "grid" ? "active" : ""}`} onClick={() => setViewMode("grid")} aria-label="Visualização em grade">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
          <Link className="btn primary" to={`/${role}/habilitacao/novo`}>
            <Icon name="plus" /> Habilitar estocador
          </Link>
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
            <button type="button" className="btn-search">
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
                <input
                  placeholder="Buscar por nome, documento ou município..."
                  value={searchH}
                  onChange={(e) => setSearchH(e.target.value)}
                />
              </div>
            </div>
            <div className="filter-row">
              <select className="filter-field" value={filterPerfilH} onChange={(e) => setFilterPerfilH(e.target.value)}>
                <option>Todos os perfis</option>
                {perfilOptions.map((p) => (
                  <option key={p} value={p}>{labelPerfil(p)}</option>
                ))}
              </select>
              <select className="filter-field" value={filterCanalH} onChange={(e) => setFilterCanalH(e.target.value)}>
                <option>Todos os canais</option>
                <option>Ligado no novo</option>
                <option>Portal herdado</option>
              </select>
              <select className="filter-field" value={filterSituacaoH} onChange={(e) => setFilterSituacaoH(e.target.value)}>
                <option>Todas as situações</option>
                <option>Ativos</option>
                <option>Suspensos</option>
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
              <th>Estocador</th>
              <th>Perfil</th>
              <th>Canal de operação</th>
              <th>Situação</th>
              <th>Proveniência do cadastro</th>
              <th>Município</th>
              <th className="th-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((h) => (
              <tr key={h.name}>
                <td className="range-cell">
                  <strong>{h.name}</strong>
                  <span>{h.doc}</span>
                </td>
                <td>
                  <Badge tone="neutral">{labelPerfil(h.perfil)}</Badge>
                </td>
                <td>
                  <Badge tone={h.canal === "NOVO" ? "blue" : "yellow"}>
                    {h.canal === "NOVO" ? "Ligado no novo" : "Portal herdado"}
                  </Badge>
                </td>
                <td>
                  <Badge tone={h.active ? "green" : "red"}>
                    {h.active ? "Ativo" : "Suspenso"}
                  </Badge>
                </td>
                <td>{h.origem}</td>
                <td>{h.city}</td>
                <td className="td-actions">
                  <div className="action-cell">
                    {h.canal === "HERDADO" && (
                      <button className="text-btn" onClick={() => setLigar(h)}>
                        Ligar no novo
                      </button>
                    )}
                    <button className="text-btn" onClick={() => setDetalheNome(h.name)}>
                      Detalhes
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty">
                    <div>
                      <Icon name="alert" size={27} />
                    </div>
                    <strong>Nenhum estocador neste filtro</strong>
                    <span>Ajuste os filtros ou habilite um novo titular.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      ) : (
        <div className="grid-cards">
          {rows.map((h) => (
            <div key={h.name} className="grid-card">
              <div className="grid-card-accent" style={{ background: h.canal === "NOVO" ? "linear-gradient(90deg, #2196f3, #64b5f6)" : "linear-gradient(90deg, #e65100, #ffb74d)" }}></div>
              <div className="grid-card-body">
                <div className="grid-card-header">
                  <span className="categoria-badge" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                    {labelPerfil(h.perfil)}
                  </span>
                </div>
                <div className="grid-card-title">{h.name}</div>
                <div className="grid-card-date">{h.doc} · {h.city}</div>
                <div className="grid-card-divider"></div>
                <div className="grid-card-info">
                  <div className="grid-card-info-row">
                    <span>Canal: <strong>{h.canal === "NOVO" ? "Ligado no novo" : "Portal herdado"}</strong></span>
                  </div>
                  <div className="grid-card-info-row">
                    <span>Proveniência: <strong>{h.origem}</strong></span>
                  </div>
                </div>
                <div className="grid-card-footer">
                  <div className="grid-card-tag">
                    <span className="tag-label">Situação</span>
                    <span className="tag-value" style={h.active ? { color: "#2e7d32" } : { color: "#e65100" }}>{h.active ? "Ativo" : "Suspenso"}</span>
                  </div>
                  <div className="grid-card-tag grid-card-tag--num">
                    {h.canal === "HERDADO" && (
                      <button className="text-btn" onClick={() => setLigar(h)}>
                        Ligar no novo
                      </button>
                    )}
                    <button className="text-btn" onClick={() => setDetalheNome(h.name)}>
                      Detalhes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="panel-foot">
        <span>Exibindo {rows.length} de {holderList.length} estocadores</span>
      </div>

      {ligar && (
        <ModalShell
          title="Ligar titular no novo"
          subtitle={`${ligar.name} · ${ligar.doc}`}
          onClose={() => setLigar(null)}
        >
          <div className="modal-body">
            <p className="modal-copy">
              O titular passa a operar neste sistema e o acesso operacional no Portal herdado é
              bloqueado no mesmo ato (ligação por ator). O estoque é o{" "}
              <strong>mesmo estado</strong>: nada é migrado ou duplicado.
            </p>
            <p className="modal-copy">
              O perfil e as regras de fluxo vinculados ao titular passam a valer no novo
              sem retrabalho.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setLigar(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const hoje = new Date().toLocaleDateString("pt-BR");
                setHolderList((prev) =>
                  prev.map((x) =>
                    x.name === ligar.name ? { ...x, canal: "NOVO", ligadoEm: hoje } : x,
                  ),
                );
                setLigar(null);
                notify(`${ligar.name} ligado no novo — acesso no Portal herdado bloqueado.`);
              }}
            >
              Confirmar ligação
            </button>
          </div>
        </ModalShell>
      )}
      {detalheAtual && (
        <ModalShell
          title="Ficha do estocador"
          subtitle={`${detalheAtual.doc} · ${detalheAtual.city}`}
          onClose={() => setDetalheNome(null)}
        >
          <div className="modal-body">
            <div className="tag-detail-list">
              <dl>
                <div>
                  <dt>Perfil de estocador</dt>
                  <dd>{labelPerfil(detalheAtual.perfil)}</dd>
                </div>
                <div>
                  <dt>Canal de operação</dt>
                  <dd>
                    <Badge tone={detalheAtual.canal === "NOVO" ? "blue" : "yellow"}>
                      {detalheAtual.canal === "NOVO" ? "Ligado no novo" : "Portal herdado"}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Proveniência do cadastro</dt>
                  <dd>{detalheAtual.origem}</dd>
                </div>
                <div>
                  <dt>Operação no novo desde</dt>
                  <dd>{detalheAtual.ligadoEm ?? "—"}</dd>
                </div>
                <div>
                  <dt>Natureza</dt>
                  <dd>{detalheAtual.type === "PJ" ? "Pessoa jurídica" : "Pessoa física"}</dd>
                </div>
                <div>
                  <dt>Atendentes habilitados</dt>
                  <dd>{detalheAtual.type === "PJ" ? detalheAtual.atendentes : "—"}</dd>
                </div>
              </dl>
            </div>
            {detalheAtual.canal === "HERDADO" && (
              <p className="modal-copy">
                Titular operando no Portal herdado — use <strong>Ligar no novo</strong> na listagem
                para habilitar o acesso aqui e bloquear lá. O estoque é o mesmo estado,
                nada é migrado.
              </p>
            )}
            {detalheAtual.type === "PJ" && detalheAtual.canal === "NOVO" && (
              <>
                <div className="attendant-title">
                  <div>
                    <strong>Atendentes</strong>
                    <span>Usuários autorizados a operar em nome da loja</span>
                  </div>
                  <button className="btn secondary" onClick={() => addAtendente(detalheAtual)}>
                    <Icon name="plus" /> Habilitar atendente
                  </button>
                </div>
                {detalheAtual.name === "Agropecuária Pampa Sul Ltda." ? (
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
                ) : (
                  <p className="modal-copy">
                    Nenhum atendente habilitado — habilite o primeiro vínculo por CPF.
                  </p>
                )}
              </>
            )}
            <Link
              className="btn secondary audit-link"
              to={`/${role}/habilitacao/estocador-auditoria?nome=${encodeURIComponent(detalheAtual.name)}`}
            >
              <Icon name="history" size={15} /> Ver auditoria completa do estocador
            </Link>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setDetalheNome(null)}>
              Fechar
            </button>
            <button className="btn primary" onClick={() => toggleAtivo(detalheAtual)}>
              {detalheAtual.active ? "Suspender estocador" : "Reativar estocador"}
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function ProfilesPanel({
  notify,
  perfis,
  setPerfis,
  regras,
  setRegras,
  registraAuditoria,
}: {
  notify: (m: string) => void;
  perfis: PerfilCatalogo[];
  setPerfis: React.Dispatch<React.SetStateAction<PerfilCatalogo[]>>;
  regras: Record<string, PerfilRegras>;
  setRegras: React.Dispatch<React.SetStateAction<Record<string, PerfilRegras>>>;
  registraAuditoria: (entry: AuditoriaMatrizRow) => void;
}) {
  const profiles = perfis;
  const rules = regras;
  const movements = perfilMovimentos;
  const [selected, setSelected] = useState("LOJA_AGROPECUARIA");
  const [editor, setEditor] = useState<{ movement: string; side: "origem" | "destino" } | null>(null);
  const [novoPerfilOpen, setNovoPerfilOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoDesc, setNovoDesc] = useState("");
  const [apagarAlvo, setApagarAlvo] = useState<{ code: string; label: string; holders: number } | null>(null);
  const [substituto, setSubstituto] = useState("");
  const labelDe = (code: string) => profiles.find((p) => p.code === code)?.label ?? labelPerfil(code);
  // Atores de estado (titulares fixos do sistema) não são apagáveis — só perfis configuráveis
  const atoresEstado = ["SEAPI", "FABRICA", "PRODUTOR"];
  function criarPerfil() {
    const nome = novoNome.trim();
    if (!nome) {
      notify("Informe o nome do novo perfil.");
      return;
    }
    const code = nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toUpperCase();
    if (!code) {
      notify("O nome precisa ter letras ou números.");
      return;
    }
    if (profiles.some((p) => p.code === code)) {
      notify("Já existe um perfil com esse nome — escolha outro.");
      return;
    }
    setPerfis((ps) => [
      ...ps,
      { code, desc: novoDesc.trim() || "Perfil criado pela SEAPI", holders: 0, label: nome },
    ]);
    const regrasNovas: Record<string, { origem: RegraFluxo; destino: RegraFluxo }> = {};
    for (const movement of perfilMovimentos)
      regrasNovas[movement] = { origem: { tipo: "LIVRE" }, destino: { tipo: "LIVRE" } };
    setRegras((current) => ({ ...current, [code]: regrasNovas }));
    setSelected(code);
    setNovoPerfilOpen(false);
    notify(`Perfil "${nome}" criado — postura padrão livre; ajuste as regras na matriz.`);
  }
  function confirmarApagar() {
    if (!apagarAlvo) return;
    const destino = substituto ? profiles.find((p) => p.code === substituto) : null;
    if (apagarAlvo.holders > 0 && !destino) {
      notify("Escolha o perfil substituto dos estocadores vinculados.");
      return;
    }
    setPerfis((ps) =>
      ps
        .filter((p) => p.code !== apagarAlvo.code)
        .map((p) =>
          destino && p.code === destino.code ? { ...p, holders: p.holders + apagarAlvo.holders } : p,
        ),
    );
    setRegras((current) => {
      const next = { ...current };
      delete next[apagarAlvo.code];
      return next;
    });
    if (selected === apagarAlvo.code) setSelected(destino ? destino.code : "LOJA_AGROPECUARIA");
    setApagarAlvo(null);
    notify(
      destino
        ? `Perfil "${apagarAlvo.label}" apagado — ${apagarAlvo.holders} ${
            apagarAlvo.holders === 1 ? "estocador transferido" : "estocadores transferidos"
          } para "${labelDe(destino.code)}".`
        : `Perfil "${apagarAlvo.label}" apagado.`,
    );
  }
  const [draft, setDraft] = useState<{
    alvosTipo: "LIVRE" | "BLOQUEIO" | "ESCOPO";
    alvos: string[];
    exigeAprovacao: boolean;
    aprovador: "SEAPI" | "DESTINO";
  }>({ alvosTipo: "LIVRE", alvos: [], exigeAprovacao: false, aprovador: "DESTINO" });
  function abrirEditor(movement: string, side: "origem" | "destino") {
    const regra = rules[selected][movement][side];
    setDraft({
      alvosTipo: regra.tipo === "BLOQUEIO" ? "BLOQUEIO" : regra.tipo === "ESCOPO" ? "ESCOPO" : "LIVRE",
      alvos: regra.alvos ? [...regra.alvos] : [],
      exigeAprovacao: !!regra.aprovacao,
      aprovador: regra.aprovacao?.aprovador ?? "DESTINO",
    });
    setEditor({ movement, side });
  }
  function salvarEditor() {
    if (!editor) return;
    if (draft.alvosTipo === "ESCOPO" && draft.alvos.length === 0) {
      notify("Selecione ao menos um ator para o escopo — ou use Livre/Bloqueado.");
      return;
    }
    const aprov = draft.exigeAprovacao ? { aprovador: draft.aprovador } : null;
    const nova: RegraFluxo =
      draft.alvosTipo === "BLOQUEIO"
        ? { tipo: "BLOQUEIO" }
        : draft.alvosTipo === "ESCOPO"
          ? { tipo: "ESCOPO", alvos: [...draft.alvos], aprovacao: aprov }
          : { tipo: "LIVRE", aprovacao: aprov };
    const anterior = rules[selected][editor.movement][editor.side];
    if (JSON.stringify(anterior) !== JSON.stringify(nova)) {
      // RN-029: rastro imutável de toda alteração de restrição — usuário, quando, célula, anterior → nova
      registraAuditoria({
        data: new Date().toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        }),
        usuario: "seapi.fiscal",
        perfil: labelDe(selected),
        celula: `${editor.movement} · ${editor.side === "origem" ? "Enviar" : "Receber"}`,
        de: regraLabel(anterior),
        para: regraLabel(nova),
      });
    }
    setRegras((current) => ({
      ...current,
      [selected]: {
        ...current[selected],
        [editor.movement]: { ...current[selected][editor.movement], [editor.side]: nova },
      },
    }));
    setEditor(null);
    notify("Restrição atualizada — efeito prospectivo: movimentos já registrados não são revalidados.");
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
            className="btn primary pill"
            onClick={() => {
              setNovoNome("");
              setNovoDesc("");
              setNovoPerfilOpen(true);
            }}
          >
            <Icon name="plus" /> Novo perfil
          </button>
        </div>
        <div className="holder-list">
          {profiles.map((profile) => {
            const fixo = atoresEstado.includes(profile.code);
            return (
              <div
                key={profile.code}
                role="button"
                tabIndex={0}
                className={`holder-row ${selected === profile.code ? "selected" : ""}`}
                onClick={() => setSelected(profile.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelected(profile.code);
                }}
              >
                <div className="company-icon">{profile.code.slice(0, 2)}</div>
                <div>
                  <strong>{labelDe(profile.code)}</strong>
                  <span>{profile.desc}</span>
                </div>
                <span className="holder-count">
                  {profile.holders} {profile.holders === 1 ? "estocador" : "estocadores"}
                </span>
                <Icon name="chevron" size={15} />
                <button
                  className="del-btn"
                  title={
                    fixo
                      ? "Ator de estado do sistema — não pode ser apagado"
                      : "Apagar perfil"
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    if (fixo) {
                      notify(
                        `${labelDe(profile.code)} é um ator de estado do sistema e não pode ser apagado.`,
                      );
                      return;
                    }
                    setSubstituto(
                      profiles.find((p) => p.code !== profile.code)?.code ?? "",
                    );
                    setApagarAlvo({
                      code: profile.code,
                      label: labelDe(profile.code),
                      holders: profile.holders,
                    });
                  }}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div className="audit-note">
          <Icon name="history" />
          <span>
            Perfil com estocadores vinculados não pode ser inativado — transfira-os para outro
            perfil antes. A configuração inicial vem como ponto de partida, e tudo aqui é editável
            pela SEAPI.
          </span>
        </div>
      </section>
      <aside className="panel attendant-panel">
        <div className="panel-head">
          <div>
            <span className="eyebrow">MATRIZ DE REGRAS DE FLUXO</span>
            <h2>{labelDe(selected)}</h2>
            <p>
              {selectedProfile.desc} · {selectedProfile.holders}{" "}
              {selectedProfile.holders === 1 ? "estocador vinculado" : "estocadores vinculados"}
            </p>
          </div>
          <button
            className="btn primary"
            onClick={() =>
              notify(
                "Regras do perfil salvas — efeito prospectivo: movimentos já registrados não são revalidados.",
              )
            }
          >
            <Icon name="check" size={16} /> Salvar regras
          </button>
        </div>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Movimento</th>
                <th>Receber</th>
                <th>Enviar</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <tr key={movement}>
                  <td>
                    <div className="movement-name">
                      <strong>{movement}</strong>
                      <InfoTip texto={movimentoDesc[movement] ?? ""} />
                    </div>
                  </td>
                  <td>
                    {celulaNaoAplicavel(selected, movement, "destino") ? (
                      <span
                        className="celula-na-aplicavel"
                        title={celulaNaoAplicavel(selected, movement, "destino") ?? undefined}
                      >
                        <Badge tone="neutral">Não aplicável</Badge>
                      </span>
                    ) : (
                      <button className="text-btn" onClick={() => abrirEditor(movement, "destino")}>
                        {badgeRegraFluxo(rules[selected][movement].destino)}
                      </button>
                    )}
                  </td>
                  <td>
                    {celulaNaoAplicavel(selected, movement, "origem") ? (
                      <span
                        className="celula-na-aplicavel"
                        title={celulaNaoAplicavel(selected, movement, "origem") ?? undefined}
                      >
                        <Badge tone="neutral">Não aplicável</Badge>
                      </span>
                    ) : (
                      <button className="text-btn" onClick={() => abrirEditor(movement, "origem")}>
                        {badgeRegraFluxo(rules[selected][movement].origem)}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="audit-note">
          <Icon name="alert" />
          <span>
            Receber mostra de quem o perfil aceita receber brincos; Enviar, para quem pode enviar.
            Clique em qualquer célula para ajustar a regra — Livre, Bloqueado, Escopo a atores
            específicos ou com aprovação.
          </span>
        </div>
      </aside>
      {apagarAlvo && (
        <ModalShell
          title="Apagar perfil"
          subtitle={
            apagarAlvo.holders > 0
              ? `${apagarAlvo.label} · ${apagarAlvo.holders} ${
                  apagarAlvo.holders === 1 ? "estocador vinculado" : "estocadores vinculados"
                }`
              : `${apagarAlvo.label} · sem estocadores vinculados`
          }
          onClose={() => setApagarAlvo(null)}
        >
          <div className="modal-body pill-form">
            {apagarAlvo.holders > 0 ? (
              <>
                <p className="modal-copy">
                  Este perfil tem estocadores vinculados. Escolha para qual perfil de habilitação
                  eles passam a pertencer — nenhum estocador pode ficar sem perfil.
                </p>
                <label className="field">
                  <span>PERFIL SUBSTITUTO DOS ESTOCADORES</span>
                  <select value={substituto} onChange={(e) => setSubstituto(e.target.value)}>
                    <option value="">Selecione o perfil substituto...</option>
                    {profiles
                      .filter((p) => p.code !== apagarAlvo.code)
                      .map((p) => (
                        <option key={p.code} value={p.code}>
                          {labelDe(p.code)} ({p.holders}{" "}
                          {p.holders === 1 ? "estocador" : "estocadores"})
                        </option>
                      ))}
                  </select>
                </label>
              </>
            ) : (
              <p className="modal-copy">
                Este perfil não tem estocadores vinculados — pode ser apagado sem transferência.
                As regras de fluxo dele também serão removidas.
              </p>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn secondary pill" onClick={() => setApagarAlvo(null)}>
              Cancelar
            </button>
            <button
              className="btn primary pill"
              disabled={apagarAlvo.holders > 0 && !substituto}
              onClick={confirmarApagar}
            >
              {apagarAlvo.holders > 0 ? "Apagar e transferir" : "Apagar perfil"}
            </button>
          </div>
        </ModalShell>
      )}
      {novoPerfilOpen && (
        <ModalShell
          title="Novo perfil de estocador"
          subtitle="O perfil nasce com postura padrão livre — sem restrição registrada, opera com qualquer titular. Ajuste as regras na matriz depois."
          onClose={() => setNovoPerfilOpen(false)}
        >
          <div className="modal-body pill-form">
            <label className="field">
              <span>NOME DO PERFIL</span>
              <input
                type="text"
                value={novoNome}
                placeholder="Ex.: Cooperativa de apicultores"
                onChange={(e) => setNovoNome(e.target.value)}
              />
            </label>
            <label className="field">
              <span>DESCRIÇÃO (OPCIONAL)</span>
              <input
                type="text"
                value={novoDesc}
                placeholder="Uma linha que explique o papel deste perfil na cadeia"
                onChange={(e) => setNovoDesc(e.target.value)}
              />
            </label>
            <p className="modal-copy">
              O perfil aparece na lista e fica disponível para habilitação de estocadores. As
              regras de fluxo dele começam livres — restrinja o que precisar na matriz de regras.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn secondary pill" onClick={() => setNovoPerfilOpen(false)}>
              Cancelar
            </button>
            <button className="btn primary pill" onClick={criarPerfil}>
              Criar perfil
            </button>
          </div>
        </ModalShell>
      )}
      {editor && (
        <ModalShell
          title="Editar restrição de fluxo"
          subtitle={`${labelDe(selected)} · ${editor.movement} · ${
            editor.side === "origem"
              ? "Envio — para quem este ator pode enviar"
              : "Recebimento — de quem este ator pode receber"
          }`}
          onClose={() => setEditor(null)}
        >
          <div className="modal-body pill-form">
            <div className="scope-options">
              <label className={`scope-option ${draft.alvosTipo === "LIVRE" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alvos-tipo"
                  checked={draft.alvosTipo === "LIVRE"}
                  onChange={() => setDraft((d) => ({ ...d, alvosTipo: "LIVRE" }))}
                />
                <div>
                  <strong>Livre</strong>
                  <span>Sem restrição — o fluxo é permitido com qualquer titular (postura padrão do sistema).</span>
                </div>
              </label>
              <label className={`scope-option ${draft.alvosTipo === "BLOQUEIO" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alvos-tipo"
                  checked={draft.alvosTipo === "BLOQUEIO"}
                  onChange={() =>
                    setDraft((d) => ({ ...d, alvosTipo: "BLOQUEIO", exigeAprovacao: false }))
                  }
                />
                <div>
                  <strong>Bloqueado</strong>
                  <span>Recusa o movimento neste lado, independentemente do alvo.</span>
                </div>
              </label>
              <label className={`scope-option ${draft.alvosTipo === "ESCOPO" ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="alvos-tipo"
                  checked={draft.alvosTipo === "ESCOPO"}
                  onChange={() => setDraft((d) => ({ ...d, alvosTipo: "ESCOPO", alvos: d.alvos }))}
                />
                <div>
                  <strong>Escopo — múltiplos atores</strong>
                  <span>
                    Permite o movimento somente com os atores selecionados abaixo: perfis e
                    titulares fixos.
                  </span>
                </div>
              </label>
            </div>
            {draft.alvosTipo === "ESCOPO" && (
              <div className="scope-targets">
                <span className="scope-targets-title">Atores autorizados (seleção múltipla)</span>
                {escopoAtores.map((a) => (
                  <label key={a.id} className="scope-target">
                    <input
                      type="checkbox"
                      checked={draft.alvos.includes(a.id)}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          alvos: e.target.checked
                            ? [...d.alvos, a.id]
                            : d.alvos.filter((x) => x !== a.id),
                        }))
                      }
                    />
                    <span>{a.label}</span>
                  </label>
                ))}
              </div>
            )}
            {draft.alvosTipo !== "BLOQUEIO" && (
            <div className="approval-block">
              <label className={`scope-option ${draft.exigeAprovacao ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  checked={draft.exigeAprovacao}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, exigeAprovacao: e.target.checked }))
                  }
                />
                <div>
                  <strong>Exige aprovação antes de executar</strong>
                  <span>
                    A movimentação entra na fila de aprovações da SEAPI e o brinco fica reservado
                    no estoque do remetente até a decisão. Complementar — combina com Livre ou
                    Escopo.
                  </span>
                </div>
              </label>
              {draft.exigeAprovacao && (
                <label className="scan-input compact">
                  <span>QUEM APROVA</span>
                  <select
                    value={draft.aprovador}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, aprovador: e.target.value as "SEAPI" | "DESTINO" }))
                    }
                  >
                    <option value="DESTINO">O próprio destinatário da movimentação</option>
                    <option value="SEAPI">A SEAPI (secretaria)</option>
                  </select>
                </label>
              )}
            </div>
            )}
            <p className="modal-copy">
              A aprovação é <strong>complementar</strong> — combina com Livre ou com Escopo; a
              exceção é o Bloqueado, que recusa sempre. O movimento aprovado executa com efeito
              prospectivo: movimentos já registrados não são revalidados.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setEditor(null)}>
              Cancelar
            </button>
            <button className="btn primary" onClick={salvarEditor}>
              Salvar restrição
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function EstocadoresRegrasPage({
  notify,
  role,
  perfis,
  setPerfis,
  regras,
  setRegras,
  registraAuditoria,
}: {
  notify: (m: string) => void;
  role: Role;
  perfis: PerfilCatalogo[];
  setPerfis: React.Dispatch<React.SetStateAction<PerfilCatalogo[]>>;
  regras: Record<string, PerfilRegras>;
  setRegras: React.Dispatch<React.SetStateAction<Record<string, PerfilRegras>>>;
  registraAuditoria: (entry: AuditoriaMatrizRow) => void;
}) {
  return (
    <div className="page-container">
      <section className="header">
        <h3>Perfis e regras de fluxo</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao/auditoria`}>
            <Icon name="history" size={15} /> Auditoria das regras
          </Link>
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao`}>
            ← Voltar
          </Link>
        </div>
      </section>
      <ProfilesPanel
        notify={notify}
        perfis={perfis}
        setPerfis={setPerfis}
        regras={regras}
        setRegras={setRegras}
        registraAuditoria={registraAuditoria}
      />
    </div>
  );
}

// Página dedicada de auditoria da matriz (RN-029) — filtros derivados dos próprios registros
function AuditoriaRegrasPage({
  role,
  auditoriaMatriz,
}: {
  role: Role;
  auditoriaMatriz: AuditoriaMatrizRow[];
}) {
  const [perfilFiltro, setPerfilFiltro] = useState("TODOS");
  const [movimentoFiltro, setMovimentoFiltro] = useState("TODOS");
  const [perfilAberto, setPerfilAberto] = useState(false);
  const perfilRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) {
        setPerfilAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const perfisDistintos = [...new Set(auditoriaMatriz.map((a) => a.perfil))];
  const movimentosDistintos = [
    ...new Set(auditoriaMatriz.map((a) => a.celula.split(" · ")[0] ?? "")),
  ].filter(Boolean);
  const filtrada = auditoriaMatriz.filter(
    (a) =>
      (perfilFiltro === "TODOS" || a.perfil === perfilFiltro) &&
      (movimentoFiltro === "TODOS" || (a.celula.split(" · ")[0] ?? "") === movimentoFiltro),
  );
  return (
    <div className="page-container">
      <section className="header">
        <h3>Auditoria das regras</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao/regras`}>
            ← Voltar às regras
          </Link>
        </div>
      </section>
      <div className="dash-note">
        <span>
          Cada edição de restrição da matriz registra um rastro imutável: quem alterou, quando,
          qual célula e o que mudou. O efeito é sempre prospectivo — movimentos já registrados
          não são revalidados. Editar novamente cria um novo registro; nenhum é apagado.
        </span>
      </div>
      <div className="dash-filters">
        <div className="filter-group">
          <span className="filter-label">Movimento</span>
          <div className="chip-set">
            <button
              className={`chip ${movimentoFiltro === "TODOS" ? "active" : ""}`}
              onClick={() => setMovimentoFiltro("TODOS")}
            >
              Todos
            </button>
            {movimentosDistintos.map((m) => (
              <button
                key={m}
                className={`chip ${movimentoFiltro === m ? "active" : ""}`}
                onClick={() => setMovimentoFiltro(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group multiselect" ref={perfilRef}>
          <span className="filter-label">Perfil</span>
          <button
            type="button"
            className={`filter-select ${perfilFiltro === "TODOS" ? "" : "ativo"}`}
            onClick={() => setPerfilAberto(!perfilAberto)}
          >
            {perfilFiltro === "TODOS" ? "Todos os perfis" : perfilFiltro}
            <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {perfilAberto && (
            <div className="multiselect-dropdown">
              {["TODOS", ...perfisDistintos].map((p) => (
                <label
                  className="ms-option"
                  key={p}
                  onClick={() => {
                    setPerfilFiltro(p);
                    setPerfilAberto(false);
                  }}
                >
                  <input type="checkbox" checked={perfilFiltro === p} readOnly />
                  <span>{p === "TODOS" ? "Todos os perfis" : p}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Histórico de edições da matriz</h2>
            <p>Do registro mais recente para o mais antigo</p>
          </div>
          <span className="head-badge">{filtrada.length} registros</span>
        </div>
        {filtrada.length === 0 ? (
          <p className="aging-note" style={{ padding: "0 20px 14px" }}>
            Nenhuma edição registrada para este recorte — ajuste os filtros de movimento ou perfil.
          </p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Célula da matriz</th>
                <th>Mudança</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((a, i) => (
                <tr key={`${a.data}-${i}`}>
                  <td>{a.data}</td>
                  <td>{a.usuario}</td>
                  <td>{a.perfil}</td>
                  <td>{a.celula}</td>
                  <td>
                    <span className="audit-change">
                      {a.de} <Icon name="chevron" size={12} /> {a.para}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// Página dedicada de auditoria das automações — histórico consolidado, derivado dos registros
function AuditoriaAutomacoesPage({
  role,
  auditoriaAutomacoes,
}: {
  role: Role;
  auditoriaAutomacoes: Record<number, RegistroAuditoria[]>;
}) {
  const [alvoFiltro, setAlvoFiltro] = useState("TODOS");
  const [alvoAberto, setAlvoAberto] = useState(false);
  const alvoRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (alvoRef.current && !alvoRef.current.contains(e.target as Node)) {
        setAlvoAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const todos = Object.entries(auditoriaAutomacoes).flatMap(([, registros]) => registros);
  const alvosDistintos = [...new Set(todos.map((r) => r.alvo ?? ""))].filter(Boolean);
  const filtrada = alvoFiltro === "TODOS" ? todos : todos.filter((r) => r.alvo === alvoFiltro);
  return (
    <div className="page-container">
      <section className="header">
        <h3>Auditoria das automações</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/automacoes`}>
            ← Voltar às automações
          </Link>
        </div>
      </section>
      <div className="dash-note">
        <span>
          Cada ação sobre as automações de geração — criação, edição, ativação, desativação e
          execução — registra um rastro imutável com autoria e resultado. Os registros não são
          apagados por edições posteriores.
        </span>
      </div>
      <div className="dash-filters">
        <div className="filter-group multiselect" ref={alvoRef}>
          <span className="filter-label">Automação</span>
          <button
            type="button"
            className={`filter-select ${alvoFiltro === "TODOS" ? "" : "ativo"}`}
            onClick={() => setAlvoAberto(!alvoAberto)}
          >
            {alvoFiltro === "TODOS" ? "Todas as automações" : alvoFiltro}
            <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {alvoAberto && (
            <div className="multiselect-dropdown">
              {["TODOS", ...alvosDistintos].map((alvo) => (
                <label
                  className="ms-option"
                  key={alvo}
                  onClick={() => {
                    setAlvoFiltro(alvo);
                    setAlvoAberto(false);
                  }}
                >
                  <input type="checkbox" checked={alvoFiltro === alvo} readOnly />
                  <span>{alvo === "TODOS" ? "Todas as automações" : alvo}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Histórico consolidado</h2>
            <p>Do registro mais recente de cada automação para o mais antigo</p>
          </div>
          <span className="head-badge">{filtrada.length} registros</span>
        </div>
        {filtrada.length === 0 ? (
          <p className="aging-note" style={{ padding: "0 20px 14px" }}>
            Nenhum evento registrado para este recorte.
          </p>
        ) : (
          <table className="history-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Usuário</th>
                <th>Automação</th>
                <th>Evento</th>
                <th>Detalhe</th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((r, i) => (
                <tr key={i}>
                  <td>{r.quando}</td>
                  <td>{r.usuario}</td>
                  <td>{r.alvo ?? "—"}</td>
                  <td>{r.evento}</td>
                  <td>{r.detalhe ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

// Página dedicada de auditoria do estocador — histórico real do titular (?nome=)
function AuditoriaEstocadorPage({
  role,
  auditoriaEstocadores,
}: {
  role: Role;
  auditoriaEstocadores: Record<string, RegistroAuditoria[]>;
}) {
  const [params] = useSearchParams();
  const nome = params.get("nome") ?? "";
  const registros = auditoriaEstocadores[nome] ?? [];
  return (
    <div className="page-container">
      <section className="header">
        <h3>Auditoria do estocador</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao`}>
            ← Voltar aos estocadores
          </Link>
        </div>
      </section>
      <div className="dash-note">
        <span>
          {nome
            ? `Histórico do titular ${nome} — habilitação, ligação de canal, atendentes e situação. Cada ação da SEAPI registra um rastro imutável; nenhuma edição apaga o anterior.`
            : "Titular não informado — volte à listagem e abra a ficha de um estocador."}
        </span>
      </div>
      <BlocoAuditoria
        registros={registros}
        titulo={nome || "Sem titular"}
        subtitulo="Do evento mais recente para o mais antigo"
      />
    </div>
  );
}

// Página dedicada de auditoria da faixa — rastro derivado do registro (?id= via rota)
export function AuditoriaFaixaPage() {
  const { rangeId } = useParams();
  const { role } = useOutletContext<PrototypeContext>();
  const range = numberingRanges.find((r) => r.start === rangeId || r.end === rangeId);
  const pecasFaixa = range ? faixaPieces[range.start] ?? [] : [];
  const auditoriaFaixa: RegistroAuditoria[] = [];
  if (range) {
    if (range.situacao !== "Disponível" && range.destino) {
      auditoriaFaixa.push({
        quando: range.dataCadastro,
        usuario: "seapi.fiscal",
        evento: "Faixa distribuída",
        detalhe: `Destinatário: ${range.destino}`,
      });
    }
    if (pecasFaixa.length > 0) {
      auditoriaFaixa.push({
        quando: range.dataCadastro,
        usuario: "seapi.fiscal",
        evento: "Brincos vinculados a titulares",
        detalhe: `${pecasFaixa.reduce((n, p) => n + p.qty, 0).toLocaleString("pt-BR")} brincos em ${pecasFaixa.length} blocos`,
      });
    }
    auditoriaFaixa.push({
      quando: range.dataCadastro,
      usuario: String(range.criadoPor ?? "seapi.fiscal"),
      evento: "Faixa gerada",
      detalhe: `Modo: ${range.modoGeracao}`,
    });
  }
  return (
    <div className="page-container">
      <section className="header">
        <h3>Auditoria da faixa</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/numeracao/${rangeId ?? ""}`}>
            ← Voltar à faixa
          </Link>
        </div>
      </section>
      <div className="dash-note">
        <span>
          {range
            ? `Faixa ${formatTag(range.start)} a ${formatTag(range.end)} — geração e alocação da numeração, com autoria e data. O rastro acompanha o ciclo de vida do registro.`
            : "Faixa não localizada — volte à gestão de numeração."}
        </span>
      </div>
      <BlocoAuditoria
        registros={auditoriaFaixa}
        titulo={range ? "Auditoria da faixa" : "Sem faixa"}
        subtitulo="Do evento mais recente para o mais antigo"
      />
    </div>
  );
}

const municipiosRS = [
  "Aceguá", "Alegrete", "Alvorada", "Arroio Grande", "Bagé", "Bento Gonçalves",
  "Cachoeira do Sul", "Camaquã", "Canela", "Capão da Canoa", "Carlos Barbosa",
  "Caxias do Sul", "Cerro Grande", "Chuí", "Cruz Alta", "Dom Pedrito", "Erechim",
  "Farroupilha", "Garibaldi", "Gramado", "Gravataí", "Guaíba", "Herval",
  "Hulha Negra", "Ijuí", "Mostardas", "Novo Hamburgo", "Passo Fundo",
  "Pedras Altas", "Pelotas", "Pinheiro Machado", "Piratini", "Porto Alegre",
  "Rio Grande", "Rosário do Sul", "Santa Cruz do Sul", "Santa Maria",
  "Santa Vitória do Palmar", "Santana do Livramento", "Santiago", "Santo Ângelo",
  "São Borja", "São Gabriel", "São Leopoldo", "Soledade", "Taquara", "Torres",
  "Tramandaí", "Vacaria", "Venâncio Aires",
];

function HabilitacaoNovoPage({
  notify,
  role,
  perfis,
  regras,
}: {
  notify: (m: string) => void;
  role: Role;
  perfis: PerfilCatalogo[];
  regras: Record<string, PerfilRegras>;
}) {
  const baseBusca = [
    { nome: "Comercial Rural Tradição Ltda.", doc: "12.345.678/0001-90", natureza: "PJ", cidade: "Bagé/RS" },
    { nome: "Agropecuária Campo Bom Ltda.", doc: "98.765.432/0001-10", natureza: "PJ", cidade: "Campo Bom/RS" },
    { nome: "Prefeitura Municipal de Dom Pedrito", doc: "87.123.456/0001-81", natureza: "PJ", cidade: "Dom Pedrito/RS" },
    { nome: "Antônio Carlos Silveira", doc: "123.456.789-00", natureza: "PF", cidade: "Alegrete/RS" },
    { nome: "Maria Inês Ferreira", doc: "987.654.321-00", natureza: "PF", cidade: "Bagé/RS" },
  ];
  type Titular = (typeof baseBusca)[number];
  const [busca, setBusca] = useState("");
  const [titular, setTitular] = useState<Titular | null>(null);
  const [perfil, setPerfil] = useState("LOJA_AGROPECUARIA");
  const [cidade, setCidade] = useState("");
  const [usarMesmoEndereco, setUsarMesmoEndereco] = useState(true);
  const [municipioQuery, setMunicipioQuery] = useState("");
  const [municipioAberto, setMunicipioAberto] = useState(false);
  const [cep, setCep] = useState("");
  const [tipoLogradouro, setTipoLogradouro] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [verRegras, setVerRegras] = useState(false);
  const [agro, setAgro] = useState<Titular | null>(null);
  const [atendente, setAtendente] = useState<Titular | null>(null);
  const [buscaAtendente, setBuscaAtendente] = useState("");
  const perfilLoja = perfil === "LOJA_AGROPECUARIA";
  const navigate = useNavigate();
  // Catálogo completo (9 perfis + os criados pela SEAPI na sessão) com fallback: perfil sem
  // restrição registrada opera livre (postura padrão — RN-012)
  const regrasPerfil =
    regras[perfil] ??
    (Object.fromEntries(perfilMovimentos.map((m) => [m, { origem: { tipo: "LIVRE" }, destino: { tipo: "LIVRE" } }])) as PerfilRegras);
  const resultados = busca.trim()
    ? baseBusca.filter((p) => `${p.nome} ${p.doc}`.toLowerCase().includes(busca.trim().toLowerCase()))
    : [];
  const resultadosPJ = perfilLoja ? resultados.filter((p) => p.natureza === "PJ") : [];
  const resultadosPF = perfilLoja && buscaAtendente.trim()
    ? baseBusca.filter(
        (p) =>
          p.natureza === "PF" &&
          `${p.nome} ${p.doc}`.toLowerCase().includes(buscaAtendente.trim().toLowerCase()),
      )
    : [];
  function escolherAgro(p: Titular) {
    setAgro(p);
    setAtendente(null);
    setBusca("");
    setBuscaAtendente("");
    setCidade(p.cidade);
    setMunicipioQuery(p.cidade);
  }
  function escolherAtendente(p: Titular) {
    setAtendente(p);
    setBuscaAtendente("");
  }
  function limparEndereco() {
    setUsarMesmoEndereco(true);
    setMunicipioQuery("");
    setMunicipioAberto(false);
    setCep("");
    setTipoLogradouro("");
    setLogradouro("");
    setNumero("");
    setComplemento("");
    setBairro("");
  }
  function escolherTitular(p: Titular) {
    setTitular(p);
    setBusca("");
    limparEndereco();
    const cidadeTitular = p.cidade.split("/")[0];
    setCidade(cidadeTitular);
    setMunicipioQuery(cidadeTitular);
  }
  function buscarCep() {
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length < 8) {
      notify("Informe um CEP com 8 dígitos para buscar o endereço.");
      return;
    }
    setTipoLogradouro("Rua");
    setLogradouro("Doutor José de Alencar");
    setBairro("Centro");
    notify("Endereço encontrado pelo CEP (base de demonstração).");
  }
  return (
    <div className="page-container">
      <section className="header">
        <h3>Nova habilitação de estocador</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao`}>
            ← Voltar
          </Link>
        </div>
      </section>
      <section className="panel novo-estocador-panel">
        <div className="panel-head">
          <div>
            <h2>{perfilLoja ? "Agropecuária e atendente" : "Dados do titular"}</h2>
            <p>
              {perfilLoja
                ? "A agropecuária (PJ) é criada no Portal herdado — aqui você habilita o estocador e vincula a pessoa que opera o balcão."
                : "Habilitação constitutiva do cadastro — o titular nasce habilitado e ligado neste sistema."}
            </p>
          </div>
        </div>
        <div className="modal-body">
          <label className="scan-input compact">
            <span>PERFIL DE ESTOCADOR — PARA VER AS REGRAS, USE O "i"</span>
            <div className="perfil-regras-controles">
              <select value={perfil} onChange={(e) => setPerfil(e.target.value)}>
                {perfis.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.label ?? labelPerfil(p.code)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="info-regras-btn"
                title="Ver as regras de fluxo deste perfil"
                onClick={() => setVerRegras(true)}
              >
                <span className="i-glyph">i</span> ver regras
              </button>
            </div>
          </label>
          {perfilLoja ? (
            <>
              {!agro ? (
                <label className="scan-input compact">
                  <span>AGROPECUÁRIA — BUSCAR A PJ CRIADA NO PORTAL HERDADO (NOME OU CNPJ)</span>
                  <div>
                    <Icon name="search" />
                    <input
                      placeholder="Digite para buscar a agropecuária..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                    />
                  </div>
                </label>
              ) : (
                <div className="titular-ficha">
                  <div className="company-icon">PJ</div>
                  <div>
                    <strong>{agro.nome}</strong>
                    <span>
                      {agro.doc} · {agro.cidade} · agropecuária criada no Portal herdado
                    </span>
                  </div>
                  <button
                    className="text-btn"
                    onClick={() => {
                      setAgro(null);
                      setAtendente(null);
                      setBusca("");
                    }}
                  >
                    trocar agropecuária
                  </button>
                </div>
              )}
              {busca.trim() && !agro && (
                <div className="busca-resultados">
                  {resultadosPJ.length === 0 && (
                    <span className="busca-vazia">
                      Nenhuma agropecuária encontrada — a criação de agropecuárias continua no
                      Portal herdado. Vincule o atendente aqui depois de criá-la lá.
                    </span>
                  )}
                  {resultadosPJ.map((p) => (
                    <button key={p.doc} className="resultado-item" onClick={() => escolherAgro(p)}>
                      <strong>{p.nome}</strong>
                      <span>
                        {p.doc} · {p.cidade} · Pessoa jurídica
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {agro && (
                <>
                  {!atendente ? (
                    <label className="scan-input compact">
                      <span>ATENDENTE — BUSCAR A PESSOA NA BASE DE CADASTRO (NOME OU CPF)</span>
                      <div>
                        <Icon name="search" />
                        <input
                          placeholder="Digite para buscar a pessoa..."
                          value={buscaAtendente}
                          onChange={(e) => setBuscaAtendente(e.target.value)}
                        />
                      </div>
                    </label>
                  ) : (
                    <div className="titular-ficha">
                      <div className="company-icon">PF</div>
                      <div>
                        <strong>{atendente.nome}</strong>
                        <span>
                          {atendente.doc} · {atendente.cidade} · atende o balcão da loja
                        </span>
                      </div>
                      <button
                        className="text-btn"
                        onClick={() => {
                          setAtendente(null);
                          setBuscaAtendente("");
                        }}
                      >
                        trocar atendente
                      </button>
                    </div>
                  )}
                  {buscaAtendente.trim() && !atendente && (
                    <div className="busca-resultados">
                      {resultadosPF.length === 0 && (
                        <span className="busca-vazia">
                          Nenhuma pessoa encontrada para "{buscaAtendente}".
                        </span>
                      )}
                      {resultadosPF.map((p) => (
                        <button
                          key={p.doc}
                          className="resultado-item"
                          onClick={() => escolherAtendente(p)}
                        >
                          <strong>{p.nome}</strong>
                          <span>
                            {p.doc} · {p.cidade} · Pessoa física
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
          {!titular ? (
            <label className="scan-input compact">
              <span>BUSCAR NA BASE DE CADASTRO — NOME, CPF OU CNPJ</span>
              <div>
                <Icon name="search" />
                <input
                  placeholder="Digite para buscar o titular..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
            </label>
          ) : (
            <div className="titular-ficha">
              <div className="company-icon">{titular.natureza}</div>
              <div>
                <strong>{titular.nome}</strong>
                <span>
                  {titular.doc} · {titular.natureza === "PJ" ? "Pessoa jurídica — com atendentes" : "Pessoa física — sem atendentes"}
                </span>
              </div>
              <button
                className="text-btn"
                onClick={() => {
                  setTitular(null);
                  setCidade("");
                  limparEndereco();
                }}
              >
                trocar titular
              </button>
            </div>
          )}
          {busca.trim() && !titular && (
            <div className="busca-resultados">
              {resultados.length === 0 && (
                <span className="busca-vazia">Nenhum cadastro encontrado para "{busca}".</span>
              )}
              {resultados.map((p) => (
                <button key={p.doc} className="resultado-item" onClick={() => escolherTitular(p)}>
                  <strong>{p.nome}</strong>
                  <span>
                    {p.doc} · {p.cidade} · {p.natureza === "PJ" ? "Pessoa jurídica" : "Pessoa física"}
                  </span>
                </button>
              ))}
            </div>
          )}
            </>
          )}
          {(perfilLoja ? agro && atendente : titular) && (
            <div className="endereco-entrega">
              <span className="endereco-titulo">ENDEREÇO DE ENTREGA DOS BRINCOS</span>
              <label className="check-linha">
                <input
                  type="checkbox"
                  checked={usarMesmoEndereco}
                  onChange={(e) => setUsarMesmoEndereco(e.target.checked)}
                />
                <span>
                  {perfilLoja
                    ? `Usar o mesmo endereço da agropecuária (${agro?.cidade}).`
                    : `Usar o mesmo endereço do titular (${titular?.cidade}).`}
                </span>
              </label>
              {!usarMesmoEndereco && (
                <div className="endereco-grade">
                  <label className="scan-input compact select-pesquisa">
                    <span>MUNICÍPIO/UF</span>
                    <div>
                      <input
                        placeholder="Pesquisar município..."
                        value={municipioQuery}
                        onFocus={() => setMunicipioAberto(true)}
                        onBlur={() => setMunicipioAberto(false)}
                        onChange={(e) => {
                          setMunicipioQuery(e.target.value);
                          setMunicipioAberto(true);
                        }}
                      />
                    </div>
                    {municipioAberto && (
                      <div className="lista-municipios" onMouseDown={(e) => e.preventDefault()}>
                        {(() => {
                          const filtrados = municipiosRS.filter((m) =>
                            m.toLowerCase().includes(municipioQuery.trim().toLowerCase()),
                          );
                          if (filtrados.length === 0)
                            return (
                              <span className="lista-vazia">
                                Nenhum município encontrado para "{municipioQuery}".
                              </span>
                            );
                          return filtrados.map((m) => (
                            <button
                              key={m}
                              type="button"
                              className={`item-municipio ${m === cidade ? "selecionado" : ""}`}
                              onClick={() => {
                                setCidade(m);
                                setMunicipioQuery(m);
                                setMunicipioAberto(false);
                              }}
                            >
                              {m}
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </label>
                  <div className="cep-bloco">
                    <label className="scan-input compact">
                      <span>CEP</span>
                      <div>
                        <input
                          placeholder="00000-000..."
                          value={cep}
                          onChange={(e) => setCep(e.target.value)}
                        />
                      </div>
                    </label>
                    <button type="button" className="text-btn" onClick={buscarCep}>
                      Buscar endereço
                    </button>
                  </div>
                  <label className="scan-input compact">
                    <span>TIPO DE LOGRADOURO</span>
                    <div>
                      <select
                        value={tipoLogradouro}
                        onChange={(e) => setTipoLogradouro(e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        <option>Rua</option>
                        <option>Avenida</option>
                        <option>Travessa</option>
                        <option>Rodovia</option>
                        <option>Distrito</option>
                      </select>
                    </div>
                  </label>
                  <label className="scan-input compact">
                    <span>LOGRADOURO</span>
                    <div>
                      <input
                        placeholder="Ex.: Doutor José de Alencar..."
                        value={logradouro}
                        onChange={(e) => setLogradouro(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="scan-input compact">
                    <span>NÚMERO</span>
                    <div>
                      <input
                        placeholder="Ex.: 1234..."
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="scan-input compact">
                    <span>COMPLEMENTO (OPCIONAL)</span>
                    <div>
                      <input
                        placeholder="Ex.: Sala 2..."
                        value={complemento}
                        onChange={(e) => setComplemento(e.target.value)}
                      />
                    </div>
                  </label>
                  <label className="scan-input compact">
                    <span>BAIRRO</span>
                    <div>
                      <input
                        placeholder="Ex.: Centro..."
                        value={bairro}
                        onChange={(e) => setBairro(e.target.value)}
                      />
                    </div>
                  </label>
                </div>
              )}
            </div>
          )}
          <p className="modal-copy">
            {perfilLoja ? (
              <>
                A criação da agropecuária continua no <strong>Portal herdado</strong> — aqui você
                apenas habilita o estocador e <strong>vincula o atendente</strong> que opera o
                balcão. O estoque fica em custódia da agropecuária; a venda ao produtor é
                registrada pelo atendente, com leitura do código de barras.
              </>
            ) : (
              <>
                O titular nasce <strong>habilitado e ligado neste sistema</strong> — não há regime
                intermediário. As regras de fluxo do perfil selecionado passam a valer a partir do
                primeiro movimento.
              </>
            )}
          </p>
        </div>
        <div className="modal-actions">
          <button className="btn secondary pill" onClick={() => navigate(`/${role}/habilitacao`)}>
            Cancelar
          </button>
          <button
            className="btn primary pill"
            disabled={perfilLoja ? !agro || !atendente : !titular}
            onClick={() => {
              if (!usarMesmoEndereco && (!cep.trim() || !logradouro.trim())) {
                notify(
                  "Preencha o endereço de entrega dos brincos — ou volte a usar o endereço de referência.",
                );
                return;
              }
              if (perfilLoja && agro && atendente) {
                notify(
                  `${atendente.nome} vinculada como atendente de ${agro.nome} — estocador habilitado e ligado no novo.`,
                );
                navigate(`/${role}/habilitacao`);
                return;
              }
              if (!titular) return;
              notify(
                `Estocador habilitado e ligado no novo — ${titular.nome}, perfil ${labelPerfil(
                  perfil,
                )}${usarMesmoEndereco ? "" : ", entrega em endereço próprio declarado"}.`,
              );
              navigate(`/${role}/habilitacao`);
            }}
          >
            {perfilLoja ? "Vincular atendente" : "Habilitar estocador"}
          </button>
        </div>
      </section>
      {verRegras && (
        <ModalShell
          title="Regras de fluxo do perfil"
          subtitle={`${labelPerfil(perfil)} — em vigor a partir do primeiro movimento`}
          onClose={() => setVerRegras(false)}
        >
          <div className="modal-body">
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Movimento</th>
                    <th>Receber</th>
                    <th>Enviar</th>
                  </tr>
                </thead>
                <tbody>
                  {perfilMovimentos.map((movement) => (
                    <tr key={movement}>
                      <td>
                        <div className="movement-name">
                          <strong>{movement}</strong>
                          <InfoTip texto={movimentoDesc[movement] ?? ""} />
                        </div>
                      </td>
                      <td>
                        {celulaNaoAplicavel(perfil, movement, "destino") ? (
                          <span
                            className="celula-na-aplicavel"
                            title={celulaNaoAplicavel(perfil, movement, "destino") ?? undefined}
                          >
                            <Badge tone="neutral">Não aplicável</Badge>
                          </span>
                        ) : (
                          badgeRegraFluxo(regrasPerfil[movement].destino)
                        )}
                      </td>
                      <td>
                        {celulaNaoAplicavel(perfil, movement, "origem") ? (
                          <span
                            className="celula-na-aplicavel"
                            title={celulaNaoAplicavel(perfil, movement, "origem") ?? undefined}
                          >
                            <Badge tone="neutral">Não aplicável</Badge>
                          </span>
                        ) : (
                          badgeRegraFluxo(regrasPerfil[movement].origem)
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="modal-copy">
              Configuração inicial do perfil — ajustável pela SEAPI em Perfis e regras de fluxo.
            </p>
          </div>
          <div className="modal-actions">
            <button className="btn primary pill" onClick={() => setVerRegras(false)}>
              Entendi
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

// Dados demonstrativos dos painéis de acompanhamento (RN-024..RN-029) — layout apenas.
const estocadoresDashDemo = {
  filaIdade: [
    { label: "Até 2 dias", value: 9, color: "#4BA044" },
    { label: "3 a 7 dias", value: 4, color: "#d99a3b" },
    { label: "8 dias ou mais", value: 2, color: "#d64545" },
  ],
  tempoAprovador: [
    { label: "SEAPI", value: "1,4 dia", hint: "média das decisões na fila do estoque central" },
    { label: "Destinatário", value: "3,2 dias", hint: "aceite remoto (produtor e destino de transferência)" },
  ],
  throughput: [
    { label: "Semana 1", aprovadas: 14, recusadas: 3 },
    { label: "Semana 2", aprovadas: 11, recusadas: 2 },
    { label: "Semana 3", aprovadas: 16, recusadas: 4 },
    { label: "Semana 4", aprovadas: 9, recusadas: 1 },
  ],
  motivosRecusa: [
    { label: "Brinco já aplicado a animal", value: 13 },
    { label: "Destinatário fora do escopo do perfil", value: 9 },
    { label: "Quantidade divergente do pedido", value: 5 },
    { label: "Brinco reservado em outra pendência", value: 3 },
  ],
  concentracao: [
    { label: "Comercial Rural Tradição", value: 78400 },
    { label: "Coop. Lacteária Santa Fé", value: 56300 },
    { label: "Agropecuária Campos Novos", value: 39800 },
    { label: "Prefeitura de Gravataí", value: 24600 },
    { label: "Inspetoria de Porto Alegre", value: 20400 },
  ],
  envelhecimento: [
    { label: "0 a 30 dias", value: 342000, color: "#4BA044" },
    { label: "31 a 90 dias", value: 85000, color: "#d99a3b" },
    { label: "Mais de 90 dias", value: 21000, color: "#d64545" },
  ],
  perdasPerfil: [
    { label: "Habilitado", value: 170, taxa: "0,9% do movimento" },
    { label: "Loja Agropecuária", value: 140, taxa: "1,6% do movimento" },
    { label: "Prefeitura", value: 45, taxa: "1,4% do movimento" },
    { label: "Cooperativa de Leite", value: 30, taxa: "1,1% do movimento" },
  ],
  devolucoesLoja: [
    { label: "Agropecuária Vale Verde", value: 34 },
    { label: "Loja Agro Campo Bom", value: 19 },
    { label: "Ruralpe Comercial", value: 11 },
  ],
  estornosAtor: [
    { label: "Prefeitura de Gravataí", value: 7 },
    { label: "Agropecuária Campos Novos", value: 5 },
    { label: "Coop. Lacteária Santa Fé", value: 3 },
    { label: "Outros titulares", value: 2 },
  ],
  recusasMatriz: [
    { label: "Cooperativa de Leite · Transferência fora do escopo", value: 12 },
    { label: "Produtor · envio de venda bloqueado", value: 8 },
    { label: "Prefeitura · Transferência fora do escopo", value: 5 },
    { label: "Loja · envio de abastecimento bloqueado", value: 3 },
  ],
  fluxoPosicao: [
    { label: "Aplicados a animal", value: 18000, color: "#4BA044" },
    { label: "Em estoque na rede", value: 14500, color: "#1565c0" },
    { label: "Em fila ou trânsito", value: 2500, color: "#d99a3b" },
  ],
  leadTime: [
    { label: "Fábrica → leitura no estoque", value: 6, display: "6 dias", color: "#1565c0" },
    { label: "Estoque → produtor (venda)", value: 14, display: "14 dias", color: "#e5a33d" },
    { label: "Crédito → aplicação no animal", value: 26, display: "26 dias", color: "#4BA044" },
  ],
  consumoPerfil: [
    { label: "Habilitado", value: 6400, display: "6.400 brincos/mês" },
    { label: "Loja Agropecuária", value: 2900, display: "2.900 brincos/mês" },
    { label: "Prefeitura", value: 1100, display: "1.100 brincos/mês" },
    { label: "Cooperativa de Leite", value: 950, display: "950 brincos/mês" },
    { label: "IDA e EDA", value: 400, display: "400 brincos/mês" },
  ],
  posicao: [
    { label: "SEAPI — estoque central", value: 120000 },
    { label: "Fábrica — envio declarado (aguarda leitura)", value: 85000 },
    { label: "Rede de estocadores", value: 448000 },
  ],
  rupturas: [
    {
      ator: "Agropecuária Vale Verde",
      detalhe: "estoque de 1.800 brincos e consumo próprio de ~2.400/mês — esgota em ~3 semanas",
    },
    {
      ator: "Prefeitura de Cachoeira do Sul",
      detalhe: "estoque de 3.200 brincos e consumo de ~1.100/mês — esgota em ~3 meses",
    },
  ],
};

// Recortes de filtro do dashboard (padrão do dashboard de numeração: presets de período + chips)
const PERIODOS_ESTOQUES = [
  { id: 30, label: "Últimos 30 dias", nome: "30 dias", f: 1 / 3 },
  { id: 90, label: "Últimos 90 dias", nome: "90 dias", f: 1 },
  { id: 180, label: "Últimos 6 meses", nome: "6 meses", f: 2 },
  { id: 365, label: "Últimos 12 meses", nome: "12 meses", f: 4 },
];
const SHARE_PERFIL: Record<string, number> = {
  TODOS: 1,
  CREDENCIADO: 0.45,
  LOJA_AGROPECUARIA: 0.18,
  PREFEITURA: 0.12,
  COOPERATIVA_LEITE: 0.1,
  INSPETORIA: 0.07,
  POSTO: 0.03,
  SEAPI: 0.03,
  FABRICA: 0.02,
  PRODUTOR: 0.01,
};
const PREFIXO_PERFIL: Record<string, string> = {
  CREDENCIADO: "Habilitado",
  LOJA_AGROPECUARIA: "Loja Agropecuária",
  PREFEITURA: "Prefeitura",
  COOPERATIVA_LEITE: "Cooperativa de Leite",
  INSPETORIA: "IDA e EDA",
  POSTO: "IDA e EDA",
  SEAPI: "SEAPI",
  FABRICA: "Fábrica de brincos",
  PRODUTOR: "Produtor",
};
const REGIMES_FILTRO = [
  { id: "TODOS", label: "Todos os regimes" },
  { id: "NOVO", label: "Ligado no novo" },
  { id: "HERDADO", label: "Portal herdado" },
] as const;

function MiniBars({
  rows,
  unit,
}: {
  rows: { label: string; value: number; display?: string; color?: string }[];
  unit?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="hbar-list">
      {rows.map((r) => (
        <div className="hbar-row creator" key={r.label}>
          <span className="hbar-name" title={r.label}>{r.label}</span>
          <div className="hbar-track">
            <span
              className="hbar-fill"
              style={{ width: `${Math.max(8, Math.round((r.value / max) * 100))}%`, background: r.color ?? "#4BA044" }}
            />
          </div>
          <span className="hbar-value">{r.display ?? `${fmtBR(r.value)}${unit ? ` ${unit}` : ""}`}</span>
        </div>
      ))}
    </div>
  );
}

function EstocadoresDashboard({
  role,
  perfis,
  auditoriaMatriz,
}: {
  role: Role;
  perfis: PerfilCatalogo[];
  auditoriaMatriz: AuditoriaMatrizRow[];
}) {
  const carga = 387;
  const ligados = 41;
  const noPortal = carga - ligados;
  const pct = Math.max(1, Math.round((ligados / carga) * 100));
  const porPerfil = [
    { nome: "CREDENCIADO", value: 299, color: "#4BA044" },
    { nome: "INSPETORIA", value: 79, color: "#1565c0" },
    { nome: "PREFEITURA", value: 5, color: "#9c27b0" },
    { nome: "COOPERATIVA_LEITE", value: 2, color: "#e5a33d" },
    { nome: "SEAPI", value: 1, color: "#e65100" },
    { nome: "LOJA_AGROPECUARIA", value: 1, color: "#46a2d5" },
  ];
  const D = estocadoresDashDemo;
  const [dashTab, setDashTab] = useState<
    "aprovacoes" | "rede" | "anomalias" | "fluxo" | "demanda" | "auditoria"
  >("aprovacoes");
  const [periodoId, setPeriodoId] = useState(90);
  const [perfilFiltro, setPerfilFiltro] = useState("TODOS");
  const [regimeFiltro, setRegimeFiltro] = useState<"TODOS" | "NOVO" | "HERDADO">("TODOS");
  const [perfilAberto, setPerfilAberto] = useState(false);
  const perfilRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (perfilRef.current && !perfilRef.current.contains(e.target as Node)) {
        setPerfilAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  // Recálculo dos painéis para o recorte selecionado (dados demonstrativos)
  // Recorte atual derivado do catálogo real de perfis (inclui os criados pela SEAPI)
  const labelDeFiltro = (code: string) => perfis.find((p) => p.code === code)?.label ?? labelPerfil(code);
  const opcoesPerfil = ["TODOS", ...perfis.map((p) => p.code)];
  const periodoSel = PERIODOS_ESTOQUES.find((p) => p.id === periodoId)!;
  const fP = periodoSel.f;
  const fR = regimeFiltro === "NOVO" ? 0.11 : regimeFiltro === "HERDADO" ? 0.89 : 1;
  const fS = SHARE_PERFIL[perfilFiltro] ?? 0.02;
  const escSnap = (n: number) => (n > 0 ? Math.max(1, Math.round(n * fR * fS)) : 0);
  const escPeriodo = (n: number) => (n > 0 ? Math.max(1, Math.round(n * fP * fR * fS)) : 0);
  const prefixoPerfil =
    perfilFiltro === "TODOS" ? null : PREFIXO_PERFIL[perfilFiltro] ?? labelDeFiltro(perfilFiltro);
  const filtraPerfil = (rows: { label: string }[]) =>
    prefixoPerfil ? rows.filter((r) => r.label.startsWith(prefixoPerfil)) : rows;
  const barras = (
    rows: { label: string; value: number; display?: string; color?: string }[],
    unit?: string,
  ) =>
    rows.length === 0 ? (
      <p className="aging-note">Sem registros no recorte selecionado.</p>
    ) : (
      <MiniBars rows={rows} unit={unit} />
    );
  const perfilNome = perfilFiltro === "TODOS" ? "todos os perfis" : labelDeFiltro(perfilFiltro);
  const regimeNome = REGIMES_FILTRO.find((r) => r.id === regimeFiltro)?.label.toLowerCase() ?? "";
  const auditoriaFiltrada = prefixoPerfil
    ? auditoriaMatriz.filter((a) => a.perfil.startsWith(prefixoPerfil))
    : auditoriaMatriz;
  const tabs: { id: typeof dashTab; label: string }[] = [
    { id: "aprovacoes", label: "Aprovações" },
    { id: "rede", label: "Rede de estocadores" },
    { id: "anomalias", label: "Anomalias" },
    { id: "fluxo", label: "Fluxo da cadeia" },
    { id: "demanda", label: "Demanda e abastecimento" },
    { id: "auditoria", label: "Auditoria das regras" },
  ];
  return (
    <div className="page-container">
      <section className="header">
        <h3>Dashboard de estocadores</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/habilitacao`}>
            ← Voltar
          </Link>
        </div>
      </section>
      <div className="dash-note">
        <span>
          Dados demonstrativos para validação de layout — não refletem números de produção. Os
          painéis acompanham a rede de estocadores, a fila de aprovações e a cadeia de custódia;
          os indicadores derivam dos registros do sistema (incluindo a visão dos titulares no
          portal herdado). Recorte atual: <strong>{periodoSel.nome}</strong> · <strong>{perfilNome}</strong> ·{" "}
          <strong>{regimeNome}</strong>.
        </span>
      </div>
      <div className="dash-filters">
        <div className="filter-group">
          <span className="filter-label">Período</span>
          <div className="chip-set">
            {PERIODOS_ESTOQUES.map((p) => (
              <button
                key={p.id}
                className={`chip ${periodoId === p.id ? "active" : ""}`}
                onClick={() => setPeriodoId(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <span className="filter-label">Regime</span>
          <div className="chip-set">
            {REGIMES_FILTRO.map((r) => (
              <button
                key={r.id}
                className={`chip ${regimeFiltro === r.id ? "active" : ""}`}
                onClick={() => setRegimeFiltro(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group multiselect" ref={perfilRef}>
          <span className="filter-label">Perfil</span>
          <button
            type="button"
            className={`filter-select ${perfilFiltro === "TODOS" ? "" : "ativo"}`}
            onClick={() => setPerfilAberto(!perfilAberto)}
          >
            {perfilFiltro === "TODOS" ? "Todos os perfis" : labelPerfil(perfilFiltro)}
            <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {perfilAberto && (
            <div className="multiselect-dropdown">
              {opcoesPerfil.map((code) => (
                <label
                  className="ms-option"
                  key={code}
                  onClick={() => {
                    setPerfilFiltro(code);
                    setPerfilAberto(false);
                  }}
                >
                  <input type="checkbox" checked={perfilFiltro === code} readOnly />
                  <span>{code === "TODOS" ? "Todos os perfis" : labelDeFiltro(code)}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="dash-grid">
        <article className="proj-card">
          <div className="proj-head">
            <h2>Progresso da adoção</h2>
            <span className="proj-pill">{pct}% ligados</span>
          </div>
          <div className="proj-value">
            {ligados} <small>de {carga}</small>
          </div>
          <div className="proj-sub">
            estocadores ligados no novo — adoção gradual por ligação de ator: o
            estoque é o mesmo estado, nada é migrado.
          </div>
          <div className="proj-track">
            <span className="proj-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="proj-meta">
            Carga inicial de identidade em 01/05/2025 · fase F2 do plano de migração
          </div>
        </article>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Estocadores por regime</h2>
              <p>Ligados no novo × operando no portal herdado (visão unificada)</p>
            </div>
          </div>
          <SituacaoDonut
            centerLabel="estocadores"
            items={[
              { label: "Ligado no novo", value: ligados, color: "#1565c0" },
              { label: "Portal herdado", value: noPortal, color: "#d99a3b" },
            ]}
          />
        </section>
      </div>
      <section className="panel dash-mt">
        <div className="panel-head">
          <div>
            <h2>Estocadores por perfil</h2>
            <p>Catálogo da carga inicial — 6 papéis + Loja Agropecuária</p>
          </div>
          <span className="head-badge">{carga} estocadores</span>
        </div>
        <div className="hbar-list">
          {porPerfil.map((p) => (
            <div className="hbar-row creator" key={p.nome}>
              <span className="hbar-name" title={p.nome}>{labelPerfil(p.nome)}</span>
              <div className="hbar-track">
                <span
                  className="hbar-fill"
                  style={{ width: `${Math.round((p.value / porPerfil[0].value) * 100)}%`, background: p.color }}
                />
              </div>
              <span className="hbar-value">
                {p.value} · {Math.round((p.value / carga) * 100)}%
              </span>
            </div>
          ))}
          <p className="aging-note">
            299 estocadores habilitados e 79 inspetorias dominam a carga inicial — perfis semeados
            do V1 com as restrições praticadas no sistema anterior.
          </p>
        </div>
      </section>
      <div className="dash-tabs dash-mt">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`dash-tab ${dashTab === t.id ? "active" : ""}`}
            onClick={() => setDashTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {dashTab === "aprovacoes" && (
        <div className="dash-mt">
          <div className="kpi-grid">
            {D.filaIdade.map((f) => (
              <div className={`kpi-card ${f.label.includes("8 dias") ? "bad" : f.label.includes("3 a 7") ? "warn" : ""}`} key={f.label}>
                <div className="kpi-value">{fmtBR(escSnap(f.value))}</div>
                <div className="kpi-label">{f.label}</div>
              </div>
            ))}
            {D.tempoAprovador.map((t) => (
              <div className="kpi-card" key={t.label}>
                <div className="kpi-value">{t.value}</div>
                <div className="kpi-label">{t.label}</div>
                <div className="proj-sub">{t.hint}</div>
              </div>
            ))}
          </div>
          <div className="dash-grid dash-mt">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Movimento da fila (4 semanas)</h2>
                  <p>Decisões concluídas por semana</p>
                </div>
              </div>
              <MiniBars
                rows={D.throughput.map((w) => ({
                  label: w.label,
                  value: escSnap(w.aprovadas),
                  display: `${fmtBR(escSnap(w.aprovadas))} aprovadas · ${fmtBR(escSnap(w.recusadas))} recusadas`,
                  color: "#4BA044",
                }))}
              />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Motivos de recusa ({periodoSel.nome})</h2>
                  <p>Recusas com motivo registrado na fila</p>
                </div>
              </div>
              {barras(D.motivosRecusa.map((r) => ({ ...r, value: escPeriodo(r.value) })), "recusas")}
            </section>
          </div>
        </div>
      )}
      {dashTab === "rede" && (
        <div className="dash-mt">
          <div className="kpi-grid">
            <div className="kpi-card warn">
              <div className="kpi-value">{fmtBR(escSnap(17))}</div>
              <div className="kpi-label">Estocadores adormecidos — sem movimento há 60+ dias</div>
            </div>
            <div className="kpi-card bad">
              <div className="kpi-value">{fmtBR(escSnap(3))}</div>
              <div className="kpi-label">Estocadores suspensos</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-value">49%</div>
              <div className="kpi-label">Do estoque da rede nos 5 maiores titulares</div>
            </div>
          </div>
          <div className="dash-grid dash-mt">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Concentração — maiores titulares</h2>
                  <p>Brincos em estoque na rede, por titular</p>
                </div>
              </div>
              <MiniBars rows={D.concentracao.map((r) => ({ ...r, value: escSnap(r.value) }))} unit="brincos" />
              <p className="aging-note">
                Os 5 maiores titulares concentram 49% do estoque da rede — acompanhar risco
                operacional e de dependência por região.
              </p>
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Envelhecimento do estoque</h2>
                  <p>Brincos por tempo sem movimentação</p>
                </div>
              </div>
              <SituacaoDonut
                centerLabel="brincos em estoque"
                items={D.envelhecimento.map((r) => ({ ...r, value: escSnap(r.value) }))}
              />
            </section>
          </div>
        </div>
      )}
      {dashTab === "anomalias" && (
        <div className="dash-mt">
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Perdas por perfil ({periodoSel.nome})</h2>
                  <p>Brincos declarados perdidos e taxa sobre o movimento</p>
                </div>
              </div>
              {barras(
                filtraPerfil(D.perdasPerfil).map((r) => ({
                  label: r.label,
                  value: escPeriodo(r.value),
                  display: `${fmtBR(escPeriodo(r.value))} · ${r.taxa}`,
                  color: "#d64545",
                })),
              )}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Devoluções por loja ({periodoSel.nome})</h2>
                  <p>Devolução alta pode indicar venda mal orientada</p>
                </div>
              </div>
              {perfilFiltro !== "TODOS" && perfilFiltro !== "LOJA_AGROPECUARIA" ? (
                <p className="aging-note">
                  Devoluções se aplicam ao varejo (Loja Agropecuária) — sem registros no perfil
                  selecionado.
                </p>
              ) : (
                barras(D.devolucoesLoja.map((r) => ({ ...r, value: escPeriodo(r.value) })), "devoluções")
              )}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Estornos por titular afetado ({periodoSel.nome})</h2>
                  <p>Correções de erro executadas pela SEAPI</p>
                </div>
              </div>
              {barras(D.estornosAtor.map((r) => ({ ...r, value: escPeriodo(r.value) })), "estornos")}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Tentativas recusadas pela matriz ({periodoSel.nome})</h2>
                  <p>Muitas recusas na mesma regra indicam regra a recalibrar — ou burla</p>
                </div>
              </div>
              {barras(
                filtraPerfil(D.recusasMatriz).map((r) => ({ ...r, value: escPeriodo(r.value) })),
                "tentativas",
              )}
            </section>
          </div>
        </div>
      )}
      {dashTab === "fluxo" && (
        <div className="dash-mt">
          <div className="dash-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Onde estão os brincos recentes</h2>
                  <p>Emissões dos últimos 90 dias — o objetivo é o brinco aplicado ao animal</p>
                </div>
              </div>
              <SituacaoDonut
                centerLabel="brincos"
                items={D.fluxoPosicao.map((r) => ({ ...r, value: escSnap(r.value) }))}
              />
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Lead time por etapa</h2>
                  <p>Tempo médio entre os marcos da cadeia</p>
                </div>
              </div>
              <MiniBars rows={D.leadTime} />
              <p className="aging-note">
                Do crédito da venda à aplicação no animal passam, em média, 26 dias — brincos
                nesse intervalo já têm dono, mas ainda não identificam animal.
              </p>
            </section>
          </div>
        </div>
      )}
      {dashTab === "demanda" && (
        <div className="dash-mt">
          <div className="kpi-grid">
            {D.posicao.map((p) => (
              <div className="kpi-card" key={p.label}>
                <div className="kpi-value">{fmtBR(escSnap(p.value))}</div>
                <div className="kpi-label">
                  {p.label} — brincos
                </div>
              </div>
            ))}
          </div>
          <div className="dash-grid dash-mt">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Consumo médio por perfil</h2>
                  <p>Brincos por mês — média dos últimos 6 meses</p>
                </div>
              </div>
              {barras(filtraPerfil(D.consumoPerfil))}
            </section>
            <section className="panel">
              <div className="panel-head">
                <div>
                  <h2>Alertas de ruptura projetada</h2>
                  <p>Onde o estoque não cobre o consumo previsto</p>
                </div>
                <span className="head-badge">{D.rupturas.length} alertas</span>
              </div>
              <div className="warn-list">
                {D.rupturas.map((r) => (
                  <div className="warn-row" key={r.ator}>
                    <Icon name="alert" />
                    <span>
                      <strong>{r.ator}</strong> — {r.detalhe}.
                    </span>
                  </div>
                ))}
              </div>
              <p className="aging-note">
                O estoque central cobre ~10 meses da demanda média da rede (11.750 brincos/mês) —
                janela para solicitar faixas ou pedir produção à fábrica antes da ruptura.
              </p>
            </section>
          </div>
        </div>
      )}
      {dashTab === "auditoria" && (
        <section className="panel dash-mt">
          <div className="panel-head">
            <div>
              <h2>Histórico de edições da matriz</h2>
              <p>Cada mudança de regra com autoria, data e o que mudou — o efeito é sempre prospectivo</p>
            </div>
            <span className="head-badge">{auditoriaFiltrada.length} registros</span>
          </div>
          {auditoriaFiltrada.length === 0 ? (
            <p className="aging-note" style={{ padding: "0 20px 14px" }}>
              Sem edições no recorte selecionado — ajuste o perfil para ver o histórico.
            </p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Usuário</th>
                  <th>Perfil</th>
                  <th>Célula da matriz</th>
                  <th>Mudança</th>
                </tr>
              </thead>
              <tbody>
                {auditoriaFiltrada.map((a, i) => (
                  <tr key={`${a.data}-${i}`}>
                    <td>{a.data}</td>
                    <td>{a.usuario}</td>
                    <td>{a.perfil}</td>
                    <td>{a.celula}</td>
                    <td>
                      <span className="audit-change">
                        {a.de} <Icon name="chevron" size={12} /> {a.para}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="aging-note">
            O rastro é imutável: editar a regra novamente cria um novo registro — nunca apaga o
            anterior. Edição tem efeito prospectivo: movimentos já registrados não são revalidados.
          </p>
        </section>
      )}
    </div>
  );
}

function NumberingPage({ notify, role }: { notify: (m: string) => void; role: Role }) {
  const [ranges, setRanges] = useState(numberingRanges);
  const [dialog, setDialog] = useState<"pnib" | "interna" | "distribute" | null>(null);
  const [distribuir, setDistribuir] = useState<(typeof numberingRanges)[number] | null>(null);
  const [distQty, setDistQty] = useState("");
  const [distErro, setDistErro] = useState("");
  const [distDestino, setDistDestino] = useState("Identifica Brasil S.A. — Fábrica");
  const [internaTipo, setInternaTipo] = useState<"SISBOV" | "INTERNACIONAL">("SISBOV");
  const [internaQtd, setInternaQtd] = useState(1000);
  const [searchNum, setSearchNum] = useState("");
  const [filterOrigem, setFilterOrigem] = useState("Todas as origens");
  const [filterTipo, setFilterTipo] = useState("Todos os tipos");
  const [filterSituacao, setFilterSituacao] = useState("Todas as situações");
  const [filterFonte, setFilterFonte] = useState("Todas as proveniências");
  const [filterDataDe, setFilterDataDe] = useState("");
  const [filterDataAte, setFilterDataAte] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const activeFilterCount = [
    filterOrigem !== "Todas as origens",
    filterTipo !== "Todos os tipos",
    filterSituacao !== "Todas as situações",
    filterFonte !== "Todas as proveniências",
    filterDataDe !== "" || filterDataAte !== "",
    searchNum.trim() !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setSearchNum("");
    setFilterOrigem("Todas as origens");
    setFilterTipo("Todos os tipos");
    setFilterSituacao("Todas as situações");
    setFilterFonte("Todas as proveniências");
    setFilterDataDe("");
    setFilterDataAte("");
  }

  function disponivelFaixa(r: { start: string; qty: number }) {
    const distribuidos = (faixaPieces[r.start] ?? []).reduce((n, p) => n + p.qty, 0);
    return r.qty - distribuidos;
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
      criadoPor: "Usuário SEAPI logado",
      modoGeracao: "Manual",
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
    if (filterFonte === "Herdadas" && r.modoGeracao !== "Herdada") return false;
    if (filterFonte === "Geradas no novo" && r.modoGeracao === "Herdada") return false;
    if (filterDataDe !== "" || filterDataAte !== "") {
      const criacao = r.dataCadastro.split("/").reverse().join("-");
      if (filterDataDe !== "" && criacao < filterDataDe) return false;
      if (filterDataAte !== "" && criacao > filterDataAte) return false;
    }
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
          <Link className="text-btn muted-action chart-btn" to={`/${role}/automacoes`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            Automações
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
                <option>Em distribuição</option>
                <option>Distribuída</option>
              </select>
              <select className="filter-field" value={filterFonte} onChange={(e) => setFilterFonte(e.target.value)}>
                <option>Todas as proveniências</option>
                <option>Herdadas</option>
                <option>Geradas no novo</option>
              </select>
              <div
                className="filter-field period-field"
                title="Filtrar faixas criadas dentro deste período"
              >
                <span className="period-label">Criação</span>
                <input
                  type="date"
                  aria-label="Data de criação — início do período"
                  value={filterDataDe}
                  onChange={(e) => setFilterDataDe(e.target.value)}
                />
                <span className="period-sep">até</span>
                <input
                  type="date"
                  aria-label="Data de criação — fim do período"
                  value={filterDataAte}
                  onChange={(e) => setFilterDataAte(e.target.value)}
                />
              </div>
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
                <th>Data de criação</th>
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
                    {r.modoGeracao === "Herdada" && (
                      <span className="proveniencia-tag">Herdada</span>
                    )}
                  </td>
                  <td>
                    <Badge tone={r.situacao === "Disponível" ? "green" : "yellow"}>{r.situacao}</Badge>
                  </td>
                  <td>{r.destino ?? "—"}</td>
                  <td>{r.dataCadastro}</td>
                  <td className="td-actions">
                    <div className="action-cell">
                      {disponivelFaixa(r) > 0 ? (
                        <button className="text-btn" onClick={() => setDistribuir(r)}>
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
                    {r.modoGeracao === "Herdada" && <span className="proveniencia-tag">Herdada</span>}
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
                  {disponivelFaixa(r) > 0 ? (
                    <div className="grid-card-tag grid-card-tag--num">
                      <button className="text-btn" onClick={() => setDistribuir(r)}>
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
          subtitle="O sistema aloca o próximo intervalo livre do pool sequencial — sem digitação de números."
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
      {distribuir && (
        <ModalShell
          title="Distribuir faixa"
          subtitle={`${formatTag(distribuir.start)} a ${formatTag(distribuir.end)} — trilha registrada na auditoria.`}
          onClose={() => {
            setDistribuir(null);
            setDistErro("");
          }}
        >
          <div className="modal-body form-grid">
            <div className="wide disponivel-box">
              <div className="disponivel-row">
                <span>Total da faixa</span>
                <strong>{distribuir.qty.toLocaleString("pt-BR")} brincos</strong>
              </div>
              <div className="disponivel-row">
                <span>Já distribuídos</span>
                <strong>
                  {(distribuir.qty - disponivelFaixa(distribuir)).toLocaleString("pt-BR")} brincos
                </strong>
              </div>
              <div className="disponivel-row disponivel-destaque">
                <span>Disponível agora</span>
                <strong>{disponivelFaixa(distribuir).toLocaleString("pt-BR")} brincos</strong>
              </div>
            </div>
            <label className="wide">
              <span>Quantidade a distribuir *</span>
              <input
                type="number"
                min={1}
                value={distQty}
                placeholder="Quantidade de brincos..."
                onChange={(e) => {
                  setDistQty(e.target.value);
                  setDistErro("");
                }}
              />
              {distErro && <span className="field-error">{distErro}</span>}
            </label>
            <label className="wide">
              <span>Destino *</span>
              <select value={distDestino} onChange={(e) => setDistDestino(e.target.value)}>
                <option>Identifica Brasil S.A. — Fábrica</option>
                <option>Brinco Sul Indústria — Fábrica</option>
                <option>Depósito central SEAPI — Estoque</option>
                <option>Agropecuária Pampa Sul Ltda. — Estoquista</option>
                <option>Antônio C. Silveira — Estoquista</option>
                <option>Prefeitura Municipal de Bagé — Estoquista</option>
              </select>
            </label>
            <label className="wide">
              <span>Observação</span>
              <textarea placeholder="Informação complementar (opcional)" />
            </label>
          </div>
          <div className="modal-actions">
            <button
              className="btn secondary"
              onClick={() => {
                setDistribuir(null);
                setDistErro("");
              }}
            >
              Cancelar
            </button>
            <button
              className="btn primary"
              onClick={() => {
                const q = Number(distQty);
                const disp = disponivelFaixa(distribuir);
                if (!q || q < 1) {
                  setDistErro("Informe a quantidade (mínimo 1 brinco).");
                  return;
                }
                if (q > disp) {
                  setDistErro(
                    `Quantidade excede o disponível — restam ${disp.toLocaleString("pt-BR")} brincos nesta faixa.`,
                  );
                  return;
                }
                // Pedaço contíguo após o último distribuído (demo — distribuição sequencial)
                const pieces = faixaPieces[distribuir.start] ?? [];
                const maxEnd = pieces.length
                  ? Math.max(...pieces.map((p) => parseInt(p.s2.slice(-6), 10)))
                  : parseInt(distribuir.start.slice(-6), 10) - 1;
                const prefixo = distribuir.start.slice(0, 9);
                const s1 = prefixo + String(maxEnd + 1).padStart(6, "0");
                const s2 = prefixo + String(maxEnd + q).padStart(6, "0");
                const titular = distDestino.split(" — ")[0];
                (faixaPieces[distribuir.start] ??= []).push({
                  titular,
                  s1,
                  s2,
                  qty: q,
                  note: `distribuída em ${new Date().toLocaleDateString("pt-BR")}`,
                });
                const completa = disp - q <= 0;
                setRanges((prev) =>
                  prev.map((x) =>
                    x.start === distribuir.start
                      ? { ...x, situacao: completa ? "Distribuída" : "Em distribuição" }
                      : x,
                  ),
                );
                setDistribuir(null);
                notify(
                  `Faixa distribuída: ${q.toLocaleString("pt-BR")} brincos (${formatTag(s1)} a ${formatTag(s2)}) → ${titular}.`,
                );
              }}
            >
              Confirmar distribuição
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
        porCriador: {
          "Geração automática — PNIB": {
            saidas: [800, 800, 600, 600, 600, 600],
            aging: [1200, 500, 300],
          },
        },
      },
      interna: {
        saidas: [0, 0, 600, 600, 900, 900],
        saldo: [1000, 1000, 1400, 800, 900, 2000],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [1000, 0, 1000, 0, 1000, 2000],
        aging: [1500, 500, 0],
        porCriador: {
          "Geração automática — interna": {
            saidas: [0, 0, 200, 200, 300, 300],
            aging: [750, 250, 0],
          },
          "Juliana P. Rocha — SEAPI": {
            saidas: [0, 0, 400, 400, 600, 600],
            aging: [750, 250, 0],
          },
        },
      },
    },
    SISBOV: {
      PNIB: {
        saidas: [0, 0, 0, 0, 0, 0],
        saldo: [0, 0, 0, 0, 0, 0],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [0, 0, 0, 0, 0, 0],
        aging: [0, 0, 0],
        porCriador: {},
      },
      interna: {
        saidas: [400, 1000, 1200, 1800, 2100, 1500],
        saldo: [2600, 3600, 4400, 5600, 6500, 7000],
        entradasPnib: [0, 0, 0, 0, 0, 0],
        entradasInterna: [3000, 2000, 2000, 3000, 3000, 2000],
        aging: [4000, 2000, 1000],
        porCriador: {
          "Geração automática — interna": {
            saidas: [150, 400, 600, 650, 950, 250],
            aging: [1800, 800, 400],
          },
          "Ana R. Farias — SEAPI": {
            saidas: [100, 300, 200, 450, 450, 500],
            aging: [1100, 600, 300],
          },
          "Carlos M. Duarte — SEAPI": {
            saidas: [75, 125, 200, 300, 400, 400],
            aging: [900, 400, 200],
          },
          "Juliana P. Rocha — SEAPI": {
            saidas: [75, 175, 200, 400, 300, 350],
            aging: [200, 200, 100],
          },
        },
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
    { nome: "Geração automática — interna", modo: "auto", origem: "interna", porTipo: { INTERNACIONAL: 2000, SISBOV: 6000 }, serie: [2000, 1000, 1500, 1000, 1500, 1000], seriePorTipo: { INTERNACIONAL: [500, 300, 400, 300, 300, 200], SISBOV: [1500, 700, 1100, 700, 1200, 800] }, color: "#0e8a6d" },
    { nome: "Geração automática — PNIB", modo: "auto", origem: "PNIB", porTipo: { INTERNACIONAL: 6000, SISBOV: 0 }, serie: [3000, 0, 0, 3000, 0, 0], seriePorTipo: { INTERNACIONAL: [3000, 0, 0, 3000, 0, 0], SISBOV: [0, 0, 0, 0, 0, 0] }, color: "#1565c0" },
    { nome: "Juliana P. Rocha — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 3000, SISBOV: 2000 }, serie: [500, 500, 500, 1000, 500, 2000], seriePorTipo: { INTERNACIONAL: [300, 300, 300, 600, 300, 1200], SISBOV: [200, 200, 200, 400, 200, 800] }, color: "#96d18a" },
    { nome: "Ana R. Farias — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 0, SISBOV: 4000 }, serie: [1000, 500, 500, 500, 1000, 500], seriePorTipo: { INTERNACIONAL: [0, 0, 0, 0, 0, 0], SISBOV: [1000, 500, 500, 500, 1000, 500] }, color: "#4BA044" },
    { nome: "Carlos M. Duarte — SEAPI", modo: "manual", origem: "interna", porTipo: { INTERNACIONAL: 0, SISBOV: 3000 }, serie: [500, 0, 500, 500, 1000, 500], seriePorTipo: { INTERNACIONAL: [0, 0, 0, 0, 0, 0], SISBOV: [500, 0, 500, 500, 1000, 500] }, color: "#6fbc5e" },
  ],
};

const zero6 = () => [0, 0, 0, 0, 0, 0];
const AGING_LABELS = ["0–30 dias", "31–60 dias", "60+ dias"];
const AGING_COLORS = ["#4BA044", "#d99a3b", "#d64545"];

const somarSeries = (
  lista: {
    saidas: number[];
    saldo?: number[];
    entradasPnib: number[];
    entradasInterna: number[];
  }[]
) =>
  lista.reduce(
    (acc, c) => ({
      saidas: acc.saidas.map((v, i) => v + c.saidas[i]),
      saldo: c.saldo ? acc.saldo.map((v, i) => v + c.saldo[i]) : acc.saldo,
      entradasPnib: acc.entradasPnib.map((v, i) => v + c.entradasPnib[i]),
      entradasInterna: acc.entradasInterna.map((v, i) => v + c.entradasInterna[i]),
    }),
    { saidas: zero6(), saldo: zero6(), entradasPnib: zero6(), entradasInterna: zero6() }
  );

const DESTINO_CELULA: Record<string, Record<string, string>> = {
  INTERNACIONAL: { PNIB: "Identifica Brasil S.A.", interna: "Pecúnia Etiquetas Ltda." },
  SISBOV: { PNIB: "", interna: "Brinco Sul Indústria" },
};

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

function SituacaoDonut({
  items,
  centerLabel = "numerações",
}: {
  items: { label: string; value: number; color: string }[];
  centerLabel?: string;
}) {
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
          {centerLabel}
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
  const [criadoresSel, setCriadoresSel] = useState<string[]>([]);
  const [multiAberto, setMultiAberto] = useState(false);
  const multiselectRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fechar = (e: MouseEvent) => {
      if (multiselectRef.current && !multiselectRef.current.contains(e.target as Node)) {
        setMultiAberto(false);
      }
    };
    document.addEventListener("mousedown", fechar);
    return () => document.removeEventListener("mousedown", fechar);
  }, []);

  const nMeses = range.to - range.from + 1;

  const todosMarcados =
    criadoresSel.length === 0 || criadoresSel.length === numberingDemo.criadores.length;
  const criadorSel = todosMarcados
    ? null
    : numberingDemo.criadores.filter((c) => criadoresSel.includes(c.nome));
  const criadorVisiveis = criadorSel
    ? criadorSel.filter((c) => origem === "TODAS" || c.origem === origem)
    : [];
  const criadorCompativel = !criadorSel || criadorVisiveis.length > 0;

  const saldoDe = (entradas: number[], saidas: number[]) => {
    const out: number[] = [];
    let e = 0;
    let s = 0;
    entradas.forEach((v, i) => {
      e += v;
      s += saidas[i];
      out.push(e - s);
    });
    return out;
  };
  const pecasDe = (t: "INTERNACIONAL" | "SISBOV") =>
    criadorVisiveis
      .map((c) => {
        const pc = numberingDemo.celulas[t][c.origem].porCriador[c.nome];
        if (!pc) return null;
        const entr = c.seriePorTipo[t];
        return {
          entradasPnib: c.origem === "PNIB" ? entr : zero6(),
          entradasInterna: c.origem === "interna" ? entr : zero6(),
          saidas: pc.saidas,
          aging: pc.aging,
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

  const celulasSelecionadas = (["INTERNACIONAL", "SISBOV"] as const)
    .filter((t) => tipo === "TODOS" || tipo === t)
    .flatMap((t) =>
      (["PNIB", "interna"] as const)
        .filter((o) => origem === "TODAS" || origem === o)
        .map((o) => numberingDemo.celulas[t][o])
    );

  const pecasPorTipo: Record<string, ReturnType<typeof pecasDe>> = criadorSel
    ? tipo === "TODOS"
      ? { INTERNACIONAL: pecasDe("INTERNACIONAL"), SISBOV: pecasDe("SISBOV") }
      : { [tipo]: pecasDe(tipo as "INTERNACIONAL" | "SISBOV") }
    : {};
  const pecasTodas = Object.values(pecasPorTipo).flat();

  const serie = criadorSel
    ? (() => {
        const soma = somarSeries(pecasTodas);
        const entrTot = soma.entradasPnib.map((v, i) => v + soma.entradasInterna[i]);
        return { ...soma, saldo: saldoDe(entrTot, soma.saidas) };
      })()
    : somarSeries(celulasSelecionadas);

  const agingBuckets = AGING_LABELS.map((label, i) => ({
    label,
    value: criadorSel
      ? pecasTodas.reduce((a, p) => a + p.aging[i], 0)
      : celulasSelecionadas.reduce((a, c) => a + c.aging[i], 0),
    color: AGING_COLORS[i],
  }));

  const cut = (arr: number[]) => arr.slice(range.from, range.to + 1);
  const monthsV = numberingDemo.months.slice(range.from, range.to + 1);
  const saidasV = cut(serie.saidas);
  const saldoV = cut(serie.saldo);
  const saldoAtual = saldoV[saldoV.length - 1];
  const mediaPeriodo = Math.round(saidasV.reduce((a, b) => a + b, 0) / saidasV.length);
  const semConsumo = mediaPeriodo === 0;
  const entrPnibV = cut(serie.entradasPnib);
  const entrInternaV = cut(serie.entradasInterna);
  const totalAutorizado = entrPnibV.reduce((a, b) => a + b, 0) + entrInternaV.reduce((a, b) => a + b, 0);
  const totalDistribuido = saidasV.reduce((a, b) => a + b, 0);
  const distribuidaCum = serie.saidas.slice(0, range.to + 1).reduce((a, b) => a + b, 0);

  const dias = semConsumo ? 0 : Math.round((saldoAtual / mediaPeriodo) * 30);
  const esgotamento = new Date(2025, 5, 30);
  esgotamento.setDate(esgotamento.getDate() + dias);
  const leadMedio = Math.round(
    numberingDemo.leadTimePnib.reduce((a, it) => a + it.autorizacao + it.entrega, 0) /
      numberingDemo.leadTimePnib.length
  );
  const mostraLead =
    origem !== "interna" &&
    tipo !== "SISBOV" &&
    (!criadorSel || criadorVisiveis.every((c) => c.origem === "PNIB"));
  const leadEfetivo = mostraLead ? leadMedio : 0;
  const coberturaLiquida = dias - leadEfetivo;
  const status = coberturaLiquida > 90 ? "ok" : coberturaLiquida >= 45 ? "warn" : "danger";
  const statusLabel =
    status === "ok" ? "Ritmo saudável" : status === "warn" ? "Atenção" : "Risco de ruptura";
  const pctBar = Math.max(0, Math.min(100, Math.round((coberturaLiquida / 180) * 100)));
  const situacao = [
    { label: "Disponível", value: saldoAtual, color: "#4BA044" },
    { label: "Distribuída", value: distribuidaCum, color: "#d99a3b" },
  ];

  const criadoresFiltrados = numberingDemo.criadores
    .filter((c) => (origem === "TODAS" || c.origem === origem) && (!criadorSel || criadorSel.some((s) => s.nome === c.nome)))
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

  const destFiltrados = criadorSel
    ? (() => {
        const mapa = new Map<string, number>();
        for (const c of criadorVisiveis) {
          for (const t of (tipo === "TODOS"
            ? ["INTERNACIONAL", "SISBOV"]
            : [tipo]) as ("INTERNACIONAL" | "SISBOV")[]) {
            const pc = numberingDemo.celulas[t][c.origem].porCriador[c.nome];
            if (!pc) continue;
            const nome = DESTINO_CELULA[t]?.[c.origem];
            if (!nome) continue;
            mapa.set(nome, (mapa.get(nome) ?? 0) + pc.saidas.reduce((a, b) => a + b, 0));
          }
        }
        return [...mapa.entries()]
          .map(([nome, value]) => ({ nome, value }))
          .filter((d) => d.value > 0)
          .sort((a, b) => b.value - a.value);
      })()
    : numberingDemo.destinatarios.filter(
        (d) => (tipo === "TODOS" || d.tipo === tipo) && (origem === "TODAS" || d.origem === origem)
      );
  const maxDest = destFiltrados.length ? Math.max(...destFiltrados.map((d) => d.value)) : 0;

  const zeroV = monthsV.map(() => 0);
  const somaSeriesCriadores = (lista: typeof numberingDemo.criadores) =>
    lista.reduce((acc, c) => {
      const s = tipo === "TODOS" ? c.serie : c.seriePorTipo[tipo];
      return acc.map((v, i) => v + s[i]);
    }, zero6());
  const pnibV = criadorSel
    ? cut(somaSeriesCriadores(criadorVisiveis.filter((c) => c.origem === "PNIB")))
    : origem === "interna"
      ? zeroV
      : cut(serie.entradasPnib);
  const internaV = criadorSel
    ? cut(somaSeriesCriadores(criadorVisiveis.filter((c) => c.origem === "interna")))
    : origem === "PNIB"
      ? zeroV
      : cut(serie.entradasInterna);

  const tipoCards = (["INTERNACIONAL", "SISBOV"] as const)
    .filter((t) => tipo === "TODOS" || tipo === t)
    .map((t) => {
      let saldoFinal: number;
      let media: number;
      if (criadorSel) {
        const pecasT = pecasDe(t);
        const saidasT = pecasT.reduce((acc, p) => acc.map((v, i) => v + p.saidas[i]), zero6());
        const entrT = pecasT.reduce(
          (acc, p) => acc.map((v, i) => v + p.entradasPnib[i] + p.entradasInterna[i]),
          zero6()
        );
        saldoFinal = saldoDe(entrT, saidasT)[range.to];
        media = Math.round(
          saidasT.slice(range.from, range.to + 1).reduce((a, b) => a + b, 0) / nMeses
        );
      } else {
        const sel = (["PNIB", "interna"] as const)
          .filter((o) => origem === "TODAS" || origem === o)
          .map((o) => numberingDemo.celulas[t][o]);
        const saidasTipo = sel.reduce((acc, c) => acc.map((v, i) => v + c.saidas[i]), zero6());
        saldoFinal = sel.reduce((a, c) => a + c.saldo[range.to], 0);
        media = Math.round(
          saidasTipo.slice(range.from, range.to + 1).reduce((a, b) => a + b, 0) / nMeses
        );
      }
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
        <div className="filter-group multiselect" ref={multiselectRef}>
          <span className="filter-label">Criador</span>
          <button
            type="button"
            className={`filter-select ${criadorSel ? "ativo" : ""}`}
            onClick={() => setMultiAberto(!multiAberto)}
          >
            {criadorSel === null
              ? "Todos os criadores"
              : criadorSel.length === 1
                ? criadorSel[0].nome
                : `${criadorSel.length} criadores selecionados`}
            <svg className="chev" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {multiAberto && (
            <div className="multiselect-dropdown">
              <div className="ms-actions">
                <button
                  type="button"
                  className="ms-action"
                  onClick={() =>
                    setCriadoresSel(
                      numberingDemo.criadores
                        .slice()
                        .sort((a, b) => (a.modo === b.modo ? a.nome.localeCompare(b.nome, "pt-BR") : a.modo === "auto" ? -1 : 1))
                        .map((c) => c.nome)
                    )
                  }
                >
                  Marcar todos
                </button>
                <button type="button" className="ms-action" onClick={() => setCriadoresSel([])}>
                  Limpar
                </button>
              </div>
              {[...numberingDemo.criadores]
                .sort((a, b) => {
                  if (a.modo !== b.modo) return a.modo === "auto" ? -1 : 1;
                  return a.nome.localeCompare(b.nome, "pt-BR");
                })
                .map((c) => (
                  <label className="ms-option" key={c.nome}>
                    <input
                      type="checkbox"
                      checked={criadoresSel.includes(c.nome)}
                      onChange={() =>
                        setCriadoresSel(
                          criadoresSel.includes(c.nome)
                            ? criadoresSel.filter((n) => n !== c.nome)
                            : [...criadoresSel, c.nome]
                        )
                      }
                    />
                    {c.nome}
                  </label>
                ))}
            </div>
          )}
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
            <small>no período</small>
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
            <small>no período</small>
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
              <p>
                {range.from > 0
                  ? "Disponível vs distribuída ao fim do período filtrado"
                  : "Disponível vs distribuída no estoque atual"}
              </p>
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
                  ? criadorCompativel
                    ? criadorVisiveis.length === 1
                      ? `Criações de ${criadorVisiveis[0].nome}`
                      : `Criações de ${criadorVisiveis.length} criadores selecionados`
                    : "Sem criações na origem filtrada"
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
                  ? `${fmtBR(totalCriado)} numerações criadas pelos criadores filtrados — ${notaPartes.join(" e ")}.`
                  : `${fmtBR(totalCriado)} numerações criadas — ${notaPartes.join(" e ")}.`}
              </p>
            </>
          ) : (
            <p className="aging-note">
              {criadorSel && !criadorCompativel
                ? "Os criadores selecionados não possuem criações na origem filtrada."
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

type Automacao = {
  id: number;
  padrao?: boolean;
  ativa: boolean;
  origem: "PNIB" | "Interna";
  tipo: "INTERNACIONAL" | "SISBOV";
  alvoModo: "especifico" | "tipo";
  atores: string[];
  tiposAtores: string[];
  gatilho: "estoque" | "pedido" | "agendamento";
  quantidadeModo: "lote" | "pedido";
  lote: number;
  frequencia: "mensal" | "semanal";
  diaMes: number;
  diaSemana: number;
  qtdMin: number | null;
  qtdMax: number | null;
  ultimaGeracao: string;
  ultimaQtd: number | null;
};

const diasSemanaNomes = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const limitesTexto = (a: Pick<Automacao, "qtdMin" | "qtdMax">) => {
  const partes: string[] = [];
  if (a.qtdMin != null) partes.push(`mín. ${fmtBR(a.qtdMin)}`);
  if (a.qtdMax != null) partes.push(`máx. ${fmtBR(a.qtdMax)}`);
  return partes.length ? ` (${partes.join(" · ")})` : "";
};

const qtdTexto = (a: Automacao) =>
  a.quantidadeModo === "pedido"
    ? `conforme o pedido do ator${limitesTexto(a)}`
    : `lote fixo de ${fmtBR(a.lote)}${limitesTexto(a)}`;

const agendamentoTexto = (a: Automacao) =>
  a.frequencia === "mensal"
    ? `todo dia ${a.diaMes} do mês`
    : `${a.diaSemana === 0 || a.diaSemana === 6 ? "todo" : "toda"} ${diasSemanaNomes[a.diaSemana]}`;

const gatilhoBadge = (a: Automacao) =>
  a.gatilho === "estoque"
    ? "Estoque mínimo"
    : a.gatilho === "pedido"
      ? "Pedido recebido"
      : a.frequencia === "mensal"
        ? "Agendamento mensal"
        : "Agendamento semanal";

const gatilhoCurto = (a: Automacao) =>
  a.gatilho === "estoque"
    ? "estoque mínimo"
    : a.gatilho === "pedido"
      ? "pedido recebido"
      : a.frequencia === "mensal"
        ? `agendamento dia ${a.diaMes}`
        : `agendamento ${diasSemanaNomes[a.diaSemana].toLowerCase()}`;

// Nome derivado da configuração — não é campo livre, é sempre recalculado
const nomeAutomacao = (a: Automacao) => {
  const alvo =
    a.alvoModo === "tipo"
      ? a.tiposAtores.join(" + ") || "sem alvo"
      : a.atores.join(" + ") || "sem alvo";
  return `${alvo} · ${a.origem} ${a.tipo} · ${gatilhoCurto(a)}`;
};

// Duas automações concorrem quando atendem o mesmo ator com a mesma
// origem e o mesmo tipo de brinco (uma sobrescreveria a outra)
const escopoSobrepoe = (
  a: Pick<Automacao, "origem" | "tipo" | "alvoModo" | "atores" | "tiposAtores">,
  b: Pick<Automacao, "origem" | "tipo" | "alvoModo" | "atores" | "tiposAtores">
) => {
  if (a.origem !== b.origem || a.tipo !== b.tipo) return false;
  const atoresDe = (x: typeof a) =>
    x.alvoModo === "tipo"
      ? atoresPendentes.filter((at) => x.tiposAtores.includes(at.perfil)).map((at) => at.nome)
      : x.atores;
  const intersecao = atoresDe(a).filter((n) => atoresDe(b).includes(n));
  return intersecao.length > 0;
};

const regraTexto = (a: Automacao) =>
  a.gatilho === "estoque"
    ? `Dispara quando o estoque do ator fica baixo · ${qtdTexto(a)}`
    : a.gatilho === "pedido"
      ? `Dispara ao receber pedido do ator · ${qtdTexto(a)}`
      : `Agendamento: ${agendamentoTexto(a)} · ${qtdTexto(a)}`;

const automacoesIniciais: Automacao[] = [
  {
    id: 1,
    ativa: true,
    origem: "Interna",
    tipo: "SISBOV",
    alvoModo: "especifico",
    atores: ["Brinco Sul Indústria"],
    tiposAtores: [],
    gatilho: "estoque",
    quantidadeModo: "lote",
    lote: 3000,
    frequencia: "mensal",
    diaMes: 1,
    diaSemana: 1,
    qtdMin: 500,
    qtdMax: 5000,
    ultimaGeracao: "05/06/2025",
    ultimaQtd: 3000,
  },
  {
    id: 2,
    ativa: true,
    origem: "PNIB",
    tipo: "INTERNACIONAL",
    alvoModo: "especifico",
    atores: ["Identifica Brasil S.A."],
    tiposAtores: [],
    gatilho: "agendamento",
    quantidadeModo: "lote",
    lote: 6000,
    frequencia: "mensal",
    diaMes: 1,
    diaSemana: 1,
    qtdMin: null,
    qtdMax: null,
    ultimaGeracao: "01/06/2025",
    ultimaQtd: 6000,
  },
  {
    id: 3,
    ativa: false,
    origem: "Interna",
    tipo: "INTERNACIONAL",
    alvoModo: "tipo",
    atores: [],
    tiposAtores: ["Fabricante de brincos"],
    gatilho: "pedido",
    quantidadeModo: "pedido",
    lote: 2000,
    frequencia: "mensal",
    diaMes: 1,
    diaSemana: 1,
    qtdMin: 500,
    qtdMax: 3000,
    ultimaGeracao: "—",
    ultimaQtd: null,
  },
  {
    id: 4,
    ativa: true,
    origem: "Interna",
    tipo: "SISBOV",
    alvoModo: "especifico",
    atores: ["Prefeitura Municipal de Bagé"],
    tiposAtores: [],
    gatilho: "agendamento",
    quantidadeModo: "lote",
    lote: 2000,
    frequencia: "semanal",
    diaMes: 5,
    diaSemana: 1,
    qtdMin: 200,
    qtdMax: 4000,
    ultimaGeracao: "16/06/2025",
    ultimaQtd: 2000,
  },
  {
    id: 5,
    ativa: true,
    origem: "Interna",
    tipo: "SISBOV",
    alvoModo: "especifico",
    atores: ["Agropecuária Pampa Sul"],
    tiposAtores: [],
    gatilho: "estoque",
    quantidadeModo: "pedido",
    lote: 1500,
    frequencia: "mensal",
    diaMes: 1,
    diaSemana: 1,
    qtdMin: 200,
    qtdMax: 2000,
    ultimaGeracao: "10/06/2025",
    ultimaQtd: 1500,
  },
  {
    id: 6,
    padrao: true,
    ativa: true,
    origem: "Interna",
    tipo: "INTERNACIONAL",
    alvoModo: "tipo",
    atores: [],
    tiposAtores: ["Agropecuárias"],
    gatilho: "pedido",
    quantidadeModo: "pedido",
    lote: 1000,
    frequencia: "mensal",
    diaMes: 1,
    diaSemana: 1,
    qtdMin: 100,
    qtdMax: 3000,
    ultimaGeracao: "—",
    ultimaQtd: null,
  },
];

// Auditoria por automação — seed derivado do cadastro; eventos ao vivo entram quando a SEAPI age
const auditoriaAutomacoesSeed: Record<number, RegistroAuditoria[]> = {};
for (const a of automacoesIniciais) {
  const eventos: RegistroAuditoria[] = [];
  if (!a.ativa) {
    eventos.unshift({
      quando: "—",
      usuario: "seapi.fiscal",
      evento: "Desativada",
      alvo: nomeAutomacao(a),
    });
  }
  if (a.ultimaGeracao !== "—") {
    eventos.unshift({
      quando: a.ultimaGeracao,
      usuario: "sistema (gatilho da automação)",
      evento: "Execução automática — faixas geradas",
      detalhe: `${fmtBR(a.ultimaQtd ?? 0)} numerações`,
      alvo: nomeAutomacao(a),
    });
  }
  eventos.unshift({
    quando: "—",
    usuario: "seapi.fiscal",
    evento: a.padrao ? "Automação padrão do sistema semeada" : "Automação criada",
    detalhe: `${a.origem} · ${a.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}`,
    alvo: nomeAutomacao(a),
  });
  auditoriaAutomacoesSeed[a.id] = eventos;
}

const atoresPendentes = [
  { nome: "Brinco Sul Indústria", pendente: 480, perfil: "Fabricante de brincos" },
  { nome: "Identifica Brasil S.A.", pendente: 1200, perfil: "Fabricante de brincos" },
  { nome: "Pecúnia Etiquetas Ltda.", pendente: 350, perfil: "Fabricante de brincos" },
  { nome: "Prefeitura Municipal de Bagé", pendente: 960, perfil: "Prefeitura" },
  { nome: "Agropecuária Pampa Sul", pendente: 120, perfil: "Agropecuárias" },
  { nome: "Agropecuária Vale Verde Ltda.", pendente: 300, perfil: "Agropecuárias" },
  { nome: "Antônio C. Silveira", pendente: 240, perfil: "Habilitado" },
  { nome: "Comercial Rural Tradição Ltda.", pendente: 600, perfil: "Habilitado" },
  { nome: "Inspetoria Veterinária Zonal — Bagé", pendente: 300, perfil: "IDA" },
  { nome: "Posto de Brincos — Camaquã", pendente: 150, perfil: "EDA" },
  { nome: "João Pedro Fagundes", pendente: 60, perfil: "Produtor rural" },
];

// Fonte: dropdown "Tipo Estocador" da tela Pesquisar Estocador (DFDS legado)
// + os atores novos do módulo (fabricante e produtor com estoque próprio)
const tiposAtoresDisponiveis = [
  "Habilitado",
  "Prefeitura",
  "IDA",
  "EDA",
  "SEAPI",
  "Cooperativa de Leite PNCEBT",
  "Agropecuárias",
  "Fabricante de brincos",
  "Produtor rural",
];

type FormAutomacao = {
  id?: number;
  origem: "PNIB" | "Interna";
  tipo: "INTERNACIONAL" | "SISBOV";
  alvoModo: "especifico" | "tipo";
  tiposAtores: string[];
  atores: string[];
  gatilho: Automacao["gatilho"];
  quantidadeModo: Automacao["quantidadeModo"];
  lote: number;
  frequencia: Automacao["frequencia"];
  diaMes: number;
  diaSemana: number;
  qtdMin: number | null;
  qtdMax: number | null;
  ativa: boolean;
};

const formNova: FormAutomacao = {
  origem: "Interna",
  tipo: "SISBOV",
  alvoModo: "especifico",
  tiposAtores: [],
  atores: [],
  gatilho: "estoque",
  quantidadeModo: "lote",
  lote: 3000,
  frequencia: "mensal",
  diaMes: 1,
  diaSemana: 1,
  qtdMin: null,
  qtdMax: null,
  ativa: true,
};

function AutomacoesPage({
  notify,
  role,
  auditoriaAutomacoes,
  registraEventoAutomacao,
}: {
  notify: (m: string) => void;
  role: Role;
  auditoriaAutomacoes: Record<number, RegistroAuditoria[]>;
  registraEventoAutomacao: (id: number, alvo: string, evento: string, detalhe?: string) => void;
}) {
  const [automacoes, setAutomacoes] = useState(automacoesIniciais);
  const [form, setForm] = useState<FormAutomacao | null>(null);
  const [buscaAtor, setBuscaAtor] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "lista">("cards");

  const abrirEdicao = (a: Automacao) =>
    setForm({
      id: a.id,
      origem: a.origem,
      tipo: a.tipo,
      alvoModo: a.alvoModo,
      atores: a.atores,
      tiposAtores: a.tiposAtores,
      gatilho: a.gatilho,
      quantidadeModo: a.quantidadeModo,
      lote: a.lote,
      frequencia: a.frequencia,
      diaMes: a.diaMes,
      diaSemana: a.diaSemana,
      qtdMin: a.qtdMin,
      qtdMax: a.qtdMax,
      ativa: a.ativa,
    });

  const alvoVazio =
    !!form &&
    (form.alvoModo === "especifico" ? form.atores.length === 0 : form.tiposAtores.length === 0);
  const conflitos = form
    ? automacoes.filter((a) => a.id !== form.id && a.ativa && escopoSobrepoe(a, form))
    : [];

  const toggleAtiva = (id: number) => {
    const alvo = automacoes.find((a) => a.id === id);
    if (!alvo) return;
    if (!alvo.ativa) {
      const conflitos = automacoes.filter(
        (a) => a.id !== id && a.ativa && escopoSobrepoe(a, alvo)
      );
      if (conflitos.length > 0) {
        notify(
          `Não é possível ativar: o escopo sobrepõe a automação ativa "${nomeAutomacao(conflitos[0])}".`
        );
        return;
      }
    }
    setAutomacoes((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ativa: !a.ativa } : a))
    );
    registraEventoAutomacao(id, nomeAutomacao(alvo), alvo.ativa ? "Desativada" : "Ativada");
    notify(`Automação "${nomeAutomacao(alvo)}" ${alvo.ativa ? "desativada" : "ativada"}.`);
  };

  const gerarAgora = (id: number) => {
    setAutomacoes((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const qtd =
          a.quantidadeModo === "pedido"
            ? Math.min(
                a.qtdMax ?? 1500,
                Math.max(a.qtdMin ?? 0, 1500)
              )
            : a.lote;
        return { ...a, ultimaGeracao: "18/06/2025", ultimaQtd: qtd };
      })
    );
    const qtdGerada =
      alvo ? (alvo.quantidadeModo === "pedido" ? Math.min(alvo.qtdMax ?? 1500, Math.max(alvo.qtdMin ?? 0, 1500)) : alvo.lote) : 0;
    registraEventoAutomacao(id, nomeAutomacao(alvo), "Execução manual — faixas geradas", `${fmtBR(qtdGerada)} numerações`);
    notify("Geração manual executada — faixas criadas conforme a automação.");
  };

  const excluir = (id: number) => {
    setAutomacoes((prev) => prev.filter((a) => a.id !== id));
    notify("Automação excluída.");
  };

  const salvar = () => {
    if (!form) return;
    if (form.id) {
      setAutomacoes((prev) =>
        prev.map((a) => (a.id === form.id ? { ...a, ...form } : a))
      );
      registraEventoAutomacao(form.id, nomeAutomacao({ ...form, id: 0 }), "Automação editada", "configuração vale para as próximas gerações");
      notify("Automação atualizada — vale para as próximas gerações.");
    } else {
      const novoId = Date.now();
      setAutomacoes((prev) => [
        ...prev,
        { ...form, id: novoId, ultimaGeracao: "—", ultimaQtd: null },
      ]);
      registraEventoAutomacao(novoId, nomeAutomacao({ ...form, id: 0 }), "Automação criada", "a geração seguirá a configuração definida");
      notify("Automação criada — a geração seguirá a configuração definida.");
    }
    setForm(null);
  };

  const ativas = automacoes.filter((a) => a.ativa).length;

  return (
    <div className="page-container">
      <section className="header">
        <h3>Automações de geração</h3>
        <div className="header-actions">
          <Link className="btn secondary voltar-pill" to={`/${role}/automacoes/auditoria`}>
            <Icon name="history" size={15} /> Auditoria
          </Link>
          <button
            className="btn primary"
            onClick={() => setForm({ ...formNova })}
          >
            <Icon name="hash" /> Nova automação
          </button>
        </div>
      </section>

      <div className="dash-note">
        As automações geram faixas de numeração sem intervenção manual, conforme a
        configuração definida pela SEAPI — origem (PNIB ou interna), tipo
        (Internacional ou SISBOV), atores atendidos e gatilho de disparo.
      </div>

      <section className="panel dash-mt">
        <div className="panel-head">
          <div>
            <h2>Automações configuradas</h2>
            <p>{ativas} ativa{ativas === 1 ? "" : "s"} de {automacoes.length}</p>
          </div>
          <div className="layout-toggle">
            <button
              className={`layout-btn ${viewMode === "lista" ? "active" : ""}`}
              onClick={() => setViewMode("lista")}
              title="Lista"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button
              className={`layout-btn ${viewMode === "cards" ? "active" : ""}`}
              onClick={() => setViewMode("cards")}
              title="Cards"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </button>
          </div>
        </div>
        {viewMode === "lista" ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Automação</th>
                  <th>Origem</th>
                  <th>Tipo</th>
                  <th>Alvos</th>
                  <th>Gatilho</th>
                  <th>Quantidade</th>
                  <th>Situação</th>
                  <th className="th-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {automacoes.map((a) => (
                  <tr key={a.id} className={a.ativa ? "" : "row-inativa"}>
                    <td className="range-cell">
                      <strong>{nomeAutomacao(a)}</strong>
                      {a.padrao && (
                        <div>
                          <Badge tone="purple">Padrão do sistema</Badge>
                        </div>
                      )}
                    </td>
                    <td>
                      <Badge tone={a.origem === "PNIB" ? "blue" : "green"}>
                        {a.origem === "PNIB" ? "PNIB" : "Interna"}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={a.tipo === "SISBOV" ? "green" : "purple"}>
                        {a.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}
                      </Badge>
                    </td>
                    <td className="alvos-cell">
                      {a.alvoModo === "tipo"
                        ? `Tipo: ${a.tiposAtores.join(", ")}`
                        : a.atores.join(", ")}
                    </td>
                    <td>{gatilhoBadge(a)}</td>
                    <td>
                      {a.quantidadeModo === "pedido"
                        ? "Conforme pedido"
                        : `Lote de ${fmtBR(a.lote)}`}
                    </td>
                    <td>
                      <Badge tone={a.ativa ? "green" : "yellow"}>
                        {a.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </td>
                    <td className="td-actions">
                      <div className="action-cell">
                        <button className="text-btn" onClick={() => gerarAgora(a.id)}>
                          Gerar agora
                        </button>
                        <button className="text-btn" onClick={() => abrirEdicao(a)}>
                          Editar
                        </button>
                        {!a.padrao && (
                          <button className="text-btn danger-text" onClick={() => excluir(a.id)}>
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="automacoes-list">
            {automacoes.map((a) => (
              <article
                key={a.id}
                className={`automacao-card ${a.ativa ? "" : "inativa"}`}
              >
                <div className="auto-head">
                  <strong>{nomeAutomacao(a)}</strong>
                  <button
                    type="button"
                    className={`switch ${a.ativa ? "on" : ""}`}
                    onClick={() => toggleAtiva(a.id)}
                    aria-label={a.ativa ? "Desativar automação" : "Ativar automação"}
                  >
                    <span className="knob" />
                  </button>
                </div>
                <div className="auto-badges">
                  {a.padrao && <span className="auto-badge padrao">Padrão do sistema</span>}
                  <span className={`auto-badge ${a.origem === "PNIB" ? "pnib" : "interna"}`}>
                    {a.origem === "PNIB" ? "PNIB" : "Interna"}
                  </span>
                  <span className={`auto-badge ${a.tipo === "SISBOV" ? "sisbov" : "internacional"}`}>
                    {a.tipo === "SISBOV" ? "Nacional · SISBOV" : "Internacional"}
                  </span>
                  <span className="auto-badge gatilho">{gatilhoBadge(a)}</span>
                  {!a.ativa && <span className="auto-badge off">Inativa</span>}
                </div>
                <div className="auto-meta">
                  <b>Atores:</b>{" "}
                  {a.alvoModo === "tipo"
                    ? `Todos do tipo: ${a.tiposAtores.join(", ") || "—"}`
                    : a.atores.join(", ") || "—"}
                </div>
                <div className="auto-meta">
                  <b>Regra:</b> {regraTexto(a)}
                </div>
                <div className="auto-footer">
                  <span className="auto-ultima">
                    Última geração: {a.ultimaGeracao}
                    {a.ultimaQtd ? ` · ${fmtBR(a.ultimaQtd)} numerações` : ""}
                  </span>
                  <div className="auto-acoes">
                    <button onClick={() => gerarAgora(a.id)}>Gerar agora</button>
                    <button onClick={() => abrirEdicao(a)}>Editar</button>
                    {!a.padrao && (
                      <button className="danger" onClick={() => excluir(a.id)}>
                        Excluir
                      </button>
                    )}
                  </div>
                </div>
                {(auditoriaAutomacoes[a.id] ?? []).length > 0 && (
                  <div className="auto-auditoria">
                    {(auditoriaAutomacoes[a.id] ?? []).slice(0, 3).map((r, i) => (
                      <small key={i}>
                        <b>{r.quando}</b> · {r.evento}
                        {r.detalhe ? ` — ${r.detalhe}` : ""}
                      </small>
                    ))}
                    {(auditoriaAutomacoes[a.id] ?? []).length > 3 && (
                      <small>… {(auditoriaAutomacoes[a.id] ?? []).length - 3} eventos anteriores</small>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      {form && (
        <ModalShell
          title={form.id ? "Editar automação" : "Nova automação"}
          subtitle="A configuração vale para as próximas gerações automáticas."
          onClose={() => setForm(null)}
        >
          <div className="modal-body form-grid af-form">
            {conflitos.length > 0 && (
              <div className="af-conflito">
                <b>Sobreposição de escopo</b>
                <p>
                  Esta configuração atende atores já cobertos pela automação ativa{" "}
                  <b>"{nomeAutomacao(conflitos[0])}"</b>
                  {conflitos.length > 1 ? ` e mais ${conflitos.length - 1} outra(s)` : ""}. Duas
                  automações concorrentes gerariam faixas duplicadas — desative a automação
                  existente ou ajuste o escopo antes de salvar.
                </p>
              </div>
            )}
            <div className="af-grid2">
              <label>
                <span>Origem da numeração</span>
                <div className="radio-pills">
                  {(["PNIB", "Interna"] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={form.origem === o ? "active" : ""}
                      onClick={() =>
                        setForm({
                          ...form,
                          origem: o,
                          tipo: o === "PNIB" ? "INTERNACIONAL" : form.tipo,
                        })
                      }
                    >
                      {o === "PNIB" ? "Brinco PNIB" : "Brinco Interno"}
                    </button>
                  ))}
                </div>
              </label>
              <label>
                <span>Tipo de brinco</span>
                <div className="radio-pills">
                  <button type="button" className={form.origem === "PNIB" || form.tipo === "INTERNACIONAL" ? "active" : ""}>
                    Internacional
                  </button>
                  <button
                    type="button"
                    className={form.origem !== "PNIB" && form.tipo === "SISBOV" ? "active" : ""}
                    disabled={form.origem === "PNIB"}
                    onClick={() => setForm({ ...form, tipo: "SISBOV" })}
                  >
                    Nacional · SISBOV
                  </button>
                </div>
                {form.origem === "PNIB" && (
                  <p className="form-hint">
                    Faixas PNIB são sempre do tipo Internacional (076).
                  </p>
                )}
              </label>
              <label className="af-full">
                <span>Gatilho da geração</span>
                <select
                  value={form.gatilho}
                  onChange={(e) => {
                    const gatilho = e.target.value as Automacao["gatilho"];
                    setForm({
                      ...form,
                      gatilho,
                      quantidadeModo: gatilho === "pedido" ? "pedido" : "lote",
                    });
                  }}
                >
                  <option value="estoque">Estoque mínimo do ator</option>
                  <option value="pedido">Pedido recebido do ator</option>
                  <option value="agendamento">Agendamento</option>
                </select>
              </label>
            </div>

            <div className="af-section">
              <span className="af-section-title">Quantidade gerada</span>
              <div className="af-col">
                <div className="radio-pills">
                  <button
                    type="button"
                    className={form.quantidadeModo === "lote" ? "active" : ""}
                    disabled={form.gatilho === "pedido"}
                    onClick={() => setForm({ ...form, quantidadeModo: "lote" })}
                  >
                    Lote fixo
                  </button>
                  <button
                    type="button"
                    className={form.quantidadeModo === "pedido" ? "active" : ""}
                    disabled={form.gatilho !== "pedido"}
                    onClick={() => setForm({ ...form, quantidadeModo: "pedido" })}
                  >
                    Conforme pedido do ator
                  </button>
                </div>
                {form.gatilho === "pedido" ? (
                  <p className="form-hint">
                    Gatilho "pedido recebido" gera sempre conforme a quantidade
                    solicitada pelo ator.
                  </p>
                ) : (
                  <label className="af-stack">
                    <span>Lote de geração (numerações)</span>
                    <input
                      type="number"
                      value={form.lote}
                      onChange={(e) => setForm({ ...form, lote: Number(e.target.value) })}
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="af-section">
              <span className="af-section-title">Bloqueios de quantidade</span>
              <div className="af-grid2">
                <label>
                  <span>Mínimo por geração</span>
                  <input
                    type="number"
                    value={form.qtdMin ?? ""}
                    placeholder="sem mínimo"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        qtdMin: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  <span>Máximo por geração</span>
                  <input
                    type="number"
                    value={form.qtdMax ?? ""}
                    placeholder="sem máximo"
                    onChange={(e) =>
                      setForm({
                        ...form,
                        qtdMax: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <p className="form-hint">
                Gerações fora da faixa são ajustadas automaticamente para esses limites.
              </p>
            </div>

            {form.gatilho === "agendamento" && (
              <div className="af-section">
                <span className="af-section-title">Agendamento</span>
                <div className="af-col">
                  <div className="radio-pills">
                    {([
                      ["mensal", "Mensal"],
                      ["semanal", "Semanal"],
                    ] as const).map(([v, l]) => (
                      <button
                        key={v}
                        type="button"
                        className={form.frequencia === v ? "active" : ""}
                        onClick={() => setForm({ ...form, frequencia: v })}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.frequencia === "mensal" ? (
                    <label className="af-stack">
                      <span>Dia do mês</span>
                      <select
                        value={form.diaMes}
                        onChange={(e) => setForm({ ...form, diaMes: Number(e.target.value) })}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>{d === 1 ? "1º do mês" : `Dia ${d}`}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label className="af-stack">
                      <span>Dia da semana</span>
                      <select
                        value={form.diaSemana}
                        onChange={(e) => setForm({ ...form, diaSemana: Number(e.target.value) })}
                      >
                        {diasSemanaNomes.map((d, i) => (
                          <option key={d} value={i}>{d}</option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            )}

            <div className="af-section">
              <span className="af-section-title">Atores atendidos</span>
              <div className="radio-pills">
                {([
                  ["especifico", "Atores específicos"],
                  ["tipo", "Por tipo de ator"],
                ] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={form.alvoModo === v ? "active" : ""}
                    onClick={() => setForm({ ...form, alvoModo: v })}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {form.alvoModo === "especifico" ? (
                <>
                  <input
                    className="af-busca-ator"
                    placeholder="Pesquisar ator por nome..."
                    value={buscaAtor}
                    onChange={(e) => setBuscaAtor(e.target.value)}
                  />
                  <div className="atores-check">
                    {atoresPendentes
                      .filter((a) =>
                        a.nome.toLowerCase().includes(buscaAtor.trim().toLowerCase())
                      )
                      .map((a) => (
                        <label key={a.nome}>
                          <input
                            type="checkbox"
                            checked={form.atores.includes(a.nome)}
                            onChange={() =>
                              setForm({
                                ...form,
                                atores: form.atores.includes(a.nome)
                                  ? form.atores.filter((n) => n !== a.nome)
                                  : [...form.atores, a.nome],
                              })
                            }
                          />
                          {a.nome}
                        </label>
                      ))}
                  </div>
                  {atoresPendentes.filter((a) =>
                    a.nome.toLowerCase().includes(buscaAtor.trim().toLowerCase())
                  ).length === 0 && (
                    <p className="form-hint">
                      Nenhum ator encontrado{buscaAtor.trim() ? ` para "${buscaAtor.trim()}"` : ""}.
                    </p>
                  )}
                  {form.atores.length === 0 && (
                    <p className="form-hint erro">Selecione ao menos um ator para salvar.</p>
                  )}
                  <p className="form-hint">
                    Somente os atores selecionados serão atendidos.
                  </p>
                </>
              ) : (
                <>
                  <div className="atores-check">
                    {tiposAtoresDisponiveis.map((t) => (
                      <label key={t}>
                        <input
                          type="checkbox"
                          checked={form.tiposAtores.includes(t)}
                          onChange={() =>
                            setForm({
                              ...form,
                              tiposAtores: form.tiposAtores.includes(t)
                                ? form.tiposAtores.filter((n) => n !== t)
                                : [...form.tiposAtores, t],
                            })
                          }
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                  {form.tiposAtores.length === 0 && (
                    <p className="form-hint erro">
                      Selecione ao menos um tipo de ator para salvar.
                    </p>
                  )}
                  <p className="form-hint">
                    Todos os atores dos tipos selecionados serão atendidos —
                    incluindo novos atores habilitados no futuro.
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setForm(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={alvoVazio || conflitos.length > 0}
              onClick={salvar}
            >
              Salvar automação
            </button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function PedidosSdaPage({
  notify,
  pedidos,
  setPedidos,
}: {
  notify: (m: string) => void;
  pedidos: PedidoSda[];
  setPedidos: React.Dispatch<React.SetStateAction<PedidoSda[]>>;
}) {
  const [recusing, setRecusing] = useState<PedidoSda | null>(null);
  const [buscaPedido, setBuscaPedido] = useState("");
  const [situacaoFiltro, setSituacaoFiltro] = useState("Todas as situações");
  const [filaFiltro, setFilaFiltro] = useState("Todas as filas");
  const [aprovadorFiltro, setAprovadorFiltro] = useState("Todos os aprovadores");
  const [municipioFiltro, setMunicipioFiltro] = useState("Todos os municípios");
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  const municipiosDistintos = [...new Set(pedidos.map((p) => p.municipio))];
  const rows = pedidos.filter((p) => {
    if (situacaoFiltro === "Solicitado" && p.situacao !== "SOLICITADO") return false;
    if (situacaoFiltro === "Enviado" && p.situacao !== "ENVIADO") return false;
    if (situacaoFiltro === "Concluído" && p.situacao !== "CONCLUIDO") return false;
    if (situacaoFiltro === "Recusado" && p.situacao !== "RECUSADO") return false;
    if (filaFiltro === "Pedidos de brincos" && p.fila !== "pedido") return false;
    if (filaFiltro === "Movimentações" && p.fila !== "movimentacao") return false;
    if (aprovadorFiltro === "SEAPI" && p.aprovador !== "SEAPI") return false;
    if (aprovadorFiltro === "Destinatário" && p.aprovador !== "DESTINO") return false;
    if (municipioFiltro !== "Todos os municípios" && p.municipio !== municipioFiltro) return false;
    const q = buscaPedido.trim().toLowerCase();
    if (q && !`${p.ator} ${p.municipio} ${p.tipo}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const activeFilterCount = [
    situacaoFiltro !== "Todas as situações",
    filaFiltro !== "Todas as filas",
    aprovadorFiltro !== "Todos os aprovadores",
    municipioFiltro !== "Todos os municípios",
    buscaPedido.trim() !== "",
  ].filter(Boolean).length;
  function clearFilters() {
    setBuscaPedido("");
    setSituacaoFiltro("Todas as situações");
    setFilaFiltro("Todas as filas");
    setAprovadorFiltro("Todos os aprovadores");
    setMunicipioFiltro("Todos os municípios");
  }
  const [reason, setReason] = useState("");
  const [atending, setAtending] = useState<PedidoSda | null>(null);
  const [atendMode, setAtendMode] = useState<"estoque" | "fabricar">("estoque");
  const [atendBrincoTipo, setAtendBrincoTipo] = useState<"SISBOV" | "INTERNACIONAL">("INTERNACIONAL");
  const [atendOrigem, setAtendOrigem] = useState<"Interna" | "PNIB">("Interna");
  const [atendPnib, setAtendPnib] = useState<"existente" | "nova">("existente");
  const [atendDestino, setAtendDestino] = useState<"sede" | "direto">("direto");
  const [atendFabrica, setAtendFabrica] = useState("Identifica Brasil S.A. — Porto Alegre/RS");
  // Demo do fluxo assíncrono PNIB (ADR-019): nenhum estoque de faixa PNIB disponível agora —
  // "usar faixa existente" bloqueia; "solicitar faixa nova" segue como PENDENTE_PNIB.
  const pnibFaixasDisponiveis = 0;
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
          item.id === recusing.id
            ? { ...item, situacao: "RECUSADO", motivo: reason.trim() }
            : item,
        ),
      );
      notify("Pedido recusado com motivo registrado na trilha de auditoria.");
      setRecusing(null);
      setReason("");
    }
  }
  return (
    <div className="page-container">
      <section className="header">
        <h3>Fila de aprovações</h3>
        <div className="header-actions">
          <Link to="novo" className="btn primary">
            <Icon name="plus" /> Novo pedido
          </Link>
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
              <button type="button" className="btn-search">
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
                  <input
                    placeholder="Buscar por ator, município ou tipo..."
                    value={buscaPedido}
                    onChange={(e) => setBuscaPedido(e.target.value)}
                  />
                </div>
              </div>
              <div className="filter-row">
                <select className="filter-field" value={situacaoFiltro} onChange={(e) => setSituacaoFiltro(e.target.value)}>
                  <option>Todas as situações</option>
                  <option>Solicitado</option>
                  <option>Enviado</option>
                  <option>Concluído</option>
                  <option>Recusado</option>
                </select>
                <select className="filter-field" value={filaFiltro} onChange={(e) => setFilaFiltro(e.target.value)}>
                  <option>Todas as filas</option>
                  <option>Pedidos de brincos</option>
                  <option>Movimentações</option>
                </select>
                <select className="filter-field" value={aprovadorFiltro} onChange={(e) => setAprovadorFiltro(e.target.value)}>
                  <option>Todos os aprovadores</option>
                  <option>SEAPI</option>
                  <option>Destinatário</option>
                </select>
                <select className="filter-field" value={municipioFiltro} onChange={(e) => setMunicipioFiltro(e.target.value)}>
                  <option>Todos os municípios</option>
                  {municipiosDistintos.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </form>

      <div className="table-container">
        <table className="data-table">
          <thead>
              <tr>
                <th>Ator que está pedindo</th>
                <th>Município</th>
                <th>Quantidade</th>
                <th>Situação</th>
                <th>Data</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <span className="aging-note" style={{ display: "block", padding: "12px 16px" }}>
                      Nenhum registro para o recorte selecionado — ajuste os filtros ou limpe a busca.
                    </span>
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="ator-cell">
                    <strong>{p.ator}</strong>
                    <small>{p.tipo}</small>
                    {p.atendente && (
                      <small className="atendente-linha">Solicitado pelo atendente: {p.atendente}</small>
                    )}
                  </td>
                  <td>{p.municipio}</td>
                  <td>
                    <strong>{p.qtd}</strong>
                  </td>
                  <td>{situacaoBadge(p.situacao)}</td>
                  <td>{p.data}</td>
                  <td>
                    <div className="action-cell">
                      {p.situacao === "SOLICITADO" && (
                        <>
                          {p.fila === "movimentacao" ? (
                            <button
                              className="text-btn"
                              onClick={() => {
                                setPedidos((prev) =>
                                  prev.map((x) =>
                                    x.id === p.id
                                      ? { ...x, situacao: "CONCLUIDO", mov: `#MOV-2025-${1850 + p.id}` }
                                      : x,
                                  ),
                                );
                                notify("Transferência aprovada e executada — custódia movida para o destinatário.");
                              }}
                            >
                              Aprovar
                            </button>
                          ) : (
                            <button className="text-btn" onClick={() => abrirAtendimento(p)}>
                              Aprovar e enviar
                            </button>
                          )}
                          <button
                            className="text-btn danger-link"
                            onClick={() => setRecusing(p)}
                          >
                            Recusar
                          </button>
                        </>
                      )}
                      <Link className="icon-btn" to={`${p.id}`} title="Ver detalhes">
                        <Icon name="eye" size={16} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
      <div className="panel-foot">
        <span>Exibindo {rows.length} de {pedidos.length} registros · estoque central como origem única</span>
      </div>
      {atending && (
        <ModalShell
          title={`Atender pedido de ${atending.ator}`}
          subtitle={`${atending.qtd} brincos — escolha a rota de atendimento.`}
          onClose={() => setAtending(null)}
        >
          <div className="modal-body atend-modal">
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
                e vinculada ao pedido — o destino confirma pela leitura do código de barras.
              </p>
            ) : (
              <>
                <label className="scan-input">
                  <span>ORIGEM DA FAIXA DEDICADA</span>
                  <div>
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
                  </div>
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
                    {atendPnib === "existente" && pnibFaixasDisponiveis === 0 && (
                      <div className="atend-warn">
                        <Icon name="alert" size={14} />
                        <span>
                          Nenhuma faixa PNIB disponível no momento —{" "}
                          <strong>solicite uma faixa nova</strong>: o atendimento fica registrado
                          e aguarda o retorno da integração antes de seguir para a fábrica.
                        </span>
                      </div>
                    )}
                    <p className="modal-copy">
                      O PNIB fornece somente o padrão Internacional (076) — o tipo fica
                      fixo.
                      {atendPnib === "nova" &&
                        " O pedido aguarda a resposta da integração antes de prosseguir para a fábrica."}
                    </p>
                  </>
                )}
                <label className="scan-input">
                  <span>TIPO DO BRINCO</span>
                  <div>
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
                  </div>
                </label>
                <label className="scan-input">
                  <span>FÁBRICA</span>
                  <div>
                    <select
                      value={atendFabrica}
                      onChange={(e) => setAtendFabrica(e.target.value)}
                    >
                      <option>Identifica Brasil S.A. — Porto Alegre/RS</option>
                      <option>Brinco Sul Indústria Ltda. — Caxias do Sul/RS</option>
                    </select>
                  </div>
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
                    ? "automaticamente do pool interno, do tipo escolhido"
                    : "da faixa PNIB vinculada ao pedido (076)"}
                  .{" "}
                  {atendDestino === "sede"
                    ? "Os brincos fabricados entram no estoque central e o pedido segue o ciclo padrão."
                    : `A fábrica envia os brincos direto a ${atending.ator} — o estoque central não entra no caminho.`}
                </p>
              </>
            )}
          </div>
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setAtending(null)}>
              Cancelar
            </button>
            <button
              className="btn primary"
              disabled={atendOrigem === "PNIB" && atendPnib === "existente"}
              title={
                atendOrigem === "PNIB" && atendPnib === "existente"
                  ? "Sem faixa PNIB disponível — solicite uma faixa nova"
                  : undefined
              }
              onClick={confirmarAtendimento}
            >
              {atendMode === "estoque" ? "Aprovar e enviar" : "Aprovar e encaminhar à fábrica"}
            </button>
          </div>
        </ModalShell>
      )}
      {recusing && (
        <ModalShell
          title={
            recusing.fila === "movimentacao"
              ? `Recusar movimentação de ${recusing.ator}`
              : `Recusar pedido de ${recusing.ator}`
          }
          subtitle="O motivo é obrigatório e fica registrado na trilha de auditoria."
          onClose={() => setRecusing(null)}
        >
          <div className="modal-body">
            <label className="scan-input">
              <span>MOTIVO DA RECUSA</span>
              <div className="textarea-box">
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: estoque central sem posição para o tipo solicitado"
                />
              </div>
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
    </div>
  );
}

function PedidoSdaFormPage({ notify, role }: { notify: (m: string) => void; role: Role }) {
  const navigate = useNavigate();
  const [newActor, setNewActor] = useState("Agropecuária Pampa Sul Ltda.");
  const [newItems, setNewItems] = useState<string[]>([]);
  const centralRanges = [
    { id: "FX-C01", start: "076210077200001", end: "076210077200240", qty: 240 },
    { id: "FX-C02", start: "076210077200241", end: "076210077200330", qty: 120 },
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
              é especificado e a quantidade é derivada da composição.
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

export function AprovacaoDetalhePage() {
  const { pedidoId } = useParams();
  const context = useOutletContext<PrototypeContext>();
  const pedido = context.pedidosSda.find((p) => String(p.id) === pedidoId);

  // Estado preservado pelo Fast Refresh pode trazer registros do formato antigo (sem composicao)
  const composicao = Array.isArray(pedido?.composicao) ? pedido.composicao : [];

  if (!pedido) {
    return (
      <section className="panel movement-not-found">
        <div className="empty">
          <div>
            <Icon name="alert" size={27} />
          </div>
          <strong>Registro não encontrado</strong>
          <span>O pedido ou pendência informado não existe ou não está disponível para este perfil.</span>
          <Link className="btn secondary" to={`/${context.role}/pedidos-sda`}>
            Voltar às aprovações
          </Link>
        </div>
      </section>
    );
  }

  const ciclo =
    pedido.situacao === "SOLICITADO"
      ? pedido.fila === "movimentacao"
        ? "Solicitado — aguardando decisão da SEAPI"
        : "Solicitado — aguardando aprovação e atendimento da SEAPI"
      : pedido.situacao === "ENVIADO"
        ? "Enviado — aguardando confirmação por leitura no destino"
        : pedido.situacao === "CONCLUIDO"
          ? "Concluído — destino confirmou pela leitura"
          : "Recusado";
  const badge =
    pedido.situacao === "SOLICITADO" ? (
      <Badge tone="yellow">Solicitado</Badge>
    ) : pedido.situacao === "ENVIADO" ? (
      <Badge tone="blue">Enviado</Badge>
    ) : pedido.situacao === "CONCLUIDO" ? (
      <Badge tone="green">Concluído</Badge>
    ) : (
      <Badge tone="red">Recusado</Badge>
    );

  return (
    <>
      <div className="tag-detail-actions tag-detail-hero">
        <Link
          className="tag-back-link"
          to={`/${context.role}/pedidos-sda`}
          aria-label="Voltar às aprovações"
        >
          ←
        </Link>
        <div className="tag-detail-hero-copy">
          <div>
            <h1>{pedido.ator}</h1>
            {badge}
          </div>
          <p>
            {pedido.fila === "movimentacao"
              ? "Movimentação aguardando aprovação"
              : "Pedido ao estoque central"}{" "}
            &middot; {pedido.qtd.toLocaleString("pt-BR")} brincos &middot; {pedido.municipio}
          </p>
        </div>
      </div>

      <div className="tag-detail-grid">
        <section className="panel tag-info-panel custody-panel">
          <div className="panel-head">
            <div>
              <h2>
                {pedido.fila === "movimentacao" ? "Dados da movimentação" : "Dados do pedido"}
              </h2>
              <p>Quem pediu e o que foi composto</p>
            </div>
            <div className="stat-icon blue">
              <Icon name="request" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Solicitante</dt>
                <dd>{pedido.ator}</dd>
              </div>
              <div>
                <dt>Perfil / canal</dt>
                <dd>{pedido.tipo}</dd>
              </div>
              <div>
                <dt>Município</dt>
                <dd>{pedido.municipio}</dd>
              </div>
              {pedido.atendente && (
                <div>
                  <dt>Atendente solicitante</dt>
                  <dd>{pedido.atendente}</dd>
                </div>
              )}
              <div>
                <dt>Quantidade</dt>
                <dd>{pedido.qtd.toLocaleString("pt-BR")} brincos</dd>
              </div>
              <div>
                <dt>Data da solicitação</dt>
                <dd>{pedido.data}</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="panel tag-info-panel origin-panel">
          <div className="panel-head">
            <div>
              <h2>Situação e ciclo</h2>
              <p>Onde o registro está na fila</p>
            </div>
            <div className="stat-icon green">
              <Icon name="history" size={18} />
            </div>
          </div>
          <div className="tag-detail-list">
            <dl>
              <div>
                <dt>Situação atual</dt>
                <dd>{badge}</dd>
              </div>
              <div>
                <dt>Ciclo</dt>
                <dd>{ciclo}</dd>
              </div>
              {pedido.situacao === "SOLICITADO" && pedido.fila === "movimentacao" && (
                <>
                  <div>
                    <dt>Aprovador</dt>
                    <dd>
                      {pedido.aprovador === "SEAPI"
                        ? "A SEAPI — política de aprovação ligada na matriz de regras deste perfil"
                        : "O próprio destinatário — pendência exibida no acesso dele"}
                    </dd>
                  </div>
                  <div>
                    <dt>Reserva durante a pendência</dt>
                    <dd>Brincos reservados no estoque do remetente até a decisão.</dd>
                  </div>
                  <div>
                    <dt>Aceite tácito</dt>
                    <dd>
                      O uso de um brinco pelo destinatário durante a pendência consolida o aceite —
                      a reversão posterior só ocorre por estorno.
                    </dd>
                  </div>
                </>
              )}
              {pedido.situacao === "RECUSADO" && pedido.motivo && (
                <div>
                  <dt>Motivo da recusa (trilha de auditoria)</dt>
                  <dd>{pedido.motivo}</dd>
                </div>
              )}
              {pedido.mov && (
                <div>
                  <dt>Movimento de envio vinculado</dt>
                  <dd>
                    Transferência ESTOQUE SDA → {pedido.ator} — consultável no histórico de
                    movimentações
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </section>
      </div>

      <section className="panel faixa-pieces-panel">
        <div className="panel-head">
          <div>
            <h2>Composição</h2>
            <p>
              Os brincos específicos deste{" "}
              {pedido.fila === "movimentacao" ? "envio" : "pedido"}
            </p>
          </div>
          <Badge tone="purple">
            {composicao.length}{" "}
            {pedido.fila === "movimentacao"
              ? "bloco sequencial"
              : composicao.length === 1
                ? "faixa"
                : "faixas"}
          </Badge>
        </div>
        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Intervalo</th>
                <th>Brincos</th>
              </tr>
            </thead>
            <tbody>
              {composicao.length === 0 ? (
                <tr>
                  <td colSpan={2}>
                    Composição não disponível neste registro — recarregue a página para atualizar
                    os dados da sessão.
                  </td>
                </tr>
              ) : (
                composicao.map((item, i) => (
                <tr key={i}>
                  <td>{item.intervalo}</td>
                  <td>
                    <strong>{item.qty.toLocaleString("pt-BR")}</strong>
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function FactoryPage({ notify }: { notify: (m: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [boxes, setBoxes] = useState([{ id: 1, start: "076210077200001", end: "076210077200240" }]);
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
                  Você pode pedir brincos diretamente à SEAPI.</strong> Ao atender,
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
            {formatTag("076210077200001")} a {formatTag("076210077200240")}
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
