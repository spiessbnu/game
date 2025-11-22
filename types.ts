export interface Scene {
  id: string;
  parent_id: string | null;
  timestamp_min: number;
  branch_label: string;
  branch_id: string; // Identificador único da linha do tempo (ex: 'main', 'branch_A')
  theme_color: string; // Hex code para cor da linha (ex: '#22d3ee')
  descricao_estado_mundo: string;
  log_eventos: string[];
  acoes_do_jogador: string;
  flags: Record<string, boolean>;
}

export interface GameState {
  tempo_atual_min: number;
  pontos_entropia: number;
  cena_atual_id: string;
  cenas: Scene[];
  flags_globais: Record<string, boolean>;
  metanarrativa?: any[];
}

export interface JumpCost {
  cena_id: string;
  timestamp_min: number;
  custo: number;
}

export interface TimelineDiff {
  nova_cena_id: string;
  cena_pai_id: string;
  timestamp_min: number;
}

export interface AIResponse {
  narrativa: string;
  estado: {
    game_state_atualizado: GameState;
    timeline_diff?: TimelineDiff;
    custos_salto_temporal: JumpCost[];
    // sugestoes_de_escolhas removido
  };
}

export type GameMode = 'acoes' | 'salto_temporal';