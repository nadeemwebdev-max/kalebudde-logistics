export interface Client {
  name: string;
  sector: string;
  logo: string;
}

export const CLIENTS: Client[] = [
  { name: "Asian Paints", sector: "Paints & coatings", logo: "/logos/asian-paints.png" },
  { name: "Cadbury", sector: "FMCG / confectionery", logo: "/logos/cadbury.png" },
  { name: "Southern Ferro", sector: "Steel & industrial", logo: "/logos/southern-ferro.png" },
  { name: "Yaara", sector: "Consumer goods", logo: "/logos/yaara.png" },
  { name: "Parekh Group", sector: "Adhesives & chemicals", logo: "/logos/parekh-group.png" },
  { name: "Indian Oil", sector: "Energy & petroleum", logo: "/logos/indian-oil.png" },
  { name: "Walkaroo", sector: "Footwear", logo: "/logos/walkaroo.png" },
  { name: "TVS Supply Chain", sector: "Supply chain solutions", logo: "/logos/tvs-supply-chain.png" },
  { name: "DS Group", sector: "FMCG conglomerate", logo: "/logos/ds-group.png" },
];

