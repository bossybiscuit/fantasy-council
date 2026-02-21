export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          is_super_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          is_super_admin?: boolean;
          created_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          is_super_admin?: boolean;
        };
        Relationships: [];
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          season_number: number;
          status: "upcoming" | "active" | "completed";
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          season_number: number;
          status?: "upcoming" | "active" | "completed";
          created_at?: string;
        };
        Update: {
          name?: string;
          season_number?: number;
          status?: "upcoming" | "active" | "completed";
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          tribe: string | null;
          tribe_color: string | null;
          suggested_value: number;
          bio: string | null;
          img_url: string | null;
          is_active: boolean;
          slug: string | null;
          hometown: string | null;
          previous_seasons: string[] | null;
          best_placement: string | null;
          placement_badge: string | null;
          vote_out_episode: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          tribe?: string | null;
          tribe_color?: string | null;
          suggested_value?: number;
          bio?: string | null;
          img_url?: string | null;
          is_active?: boolean;
          slug?: string | null;
          hometown?: string | null;
          previous_seasons?: string[] | null;
          best_placement?: string | null;
          placement_badge?: string | null;
          vote_out_episode?: number | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          tribe?: string | null;
          tribe_color?: string | null;
          suggested_value?: number;
          bio?: string | null;
          img_url?: string | null;
          is_active?: boolean;
          slug?: string | null;
          hometown?: string | null;
          previous_seasons?: string[] | null;
          best_placement?: string | null;
          placement_badge?: string | null;
          vote_out_episode?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "players_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
      leagues: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          commissioner_id: string;
          draft_type: "auction" | "snake";
          num_teams: number;
          budget: number;
          roster_size: number | null;
          invite_code: string;
          draft_status: "pending" | "active" | "completed";
          status: "setup" | "drafting" | "active" | "completed";
          scoring_config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          commissioner_id: string;
          draft_type?: "auction" | "snake";
          num_teams?: number;
          budget?: number;
          roster_size?: number | null;
          invite_code: string;
          draft_status?: "pending" | "active" | "completed";
          status?: "setup" | "drafting" | "active" | "completed";
          scoring_config?: Json;
          created_at?: string;
        };
        Update: {
          name?: string;
          draft_type?: "auction" | "snake";
          num_teams?: number;
          budget?: number;
          roster_size?: number | null;
          invite_code?: string;
          draft_status?: "pending" | "active" | "completed";
          status?: "setup" | "drafting" | "active" | "completed";
          scoring_config?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "leagues_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "leagues_commissioner_id_fkey";
            columns: ["commissioner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      teams: {
        Row: {
          id: string;
          league_id: string;
          user_id: string | null;
          name: string;
          draft_order: number | null;
          budget_remaining: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          user_id?: string | null;
          name?: string;
          draft_order?: number | null;
          budget_remaining?: number | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          name?: string;
          draft_order?: number | null;
          budget_remaining?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "teams_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teams_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      draft_picks: {
        Row: {
          id: string;
          league_id: string;
          team_id: string;
          player_id: string;
          round: number | null;
          pick_number: number | null;
          amount_paid: number | null;
          commissioner_pick: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          team_id: string;
          player_id: string;
          round?: number | null;
          pick_number?: number | null;
          amount_paid?: number | null;
          commissioner_pick?: boolean;
          created_at?: string;
        };
        Update: {
          round?: number | null;
          pick_number?: number | null;
          amount_paid?: number | null;
          commissioner_pick?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "draft_picks_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_picks_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_picks_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      draft_valuations: {
        Row: {
          id: string;
          league_id: string;
          team_id: string;
          player_id: string;
          my_value: number;
          max_bid: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          team_id: string;
          player_id: string;
          my_value?: number;
          max_bid?: number | null;
          created_at?: string;
        };
        Update: {
          my_value?: number;
          max_bid?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "draft_valuations_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_valuations_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draft_valuations_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      episodes: {
        Row: {
          id: string;
          season_id: string;
          episode_number: number;
          title: string | null;
          air_date: string | null;
          is_merge: boolean;
          is_finale: boolean;
          is_scored: boolean;
          prediction_deadline: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          episode_number: number;
          title?: string | null;
          air_date?: string | null;
          is_merge?: boolean;
          is_finale?: boolean;
          is_scored?: boolean;
          prediction_deadline?: string | null;
          created_at?: string;
        };
        Update: {
          title?: string | null;
          air_date?: string | null;
          is_merge?: boolean;
          is_finale?: boolean;
          is_scored?: boolean;
          prediction_deadline?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
      scoring_events: {
        Row: {
          id: string;
          league_id: string;
          episode_id: string;
          player_id: string;
          team_id: string | null;
          category: ScoringCategory;
          points: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          episode_id: string;
          player_id: string;
          team_id?: string | null;
          category: ScoringCategory;
          points: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          points?: number;
          note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "scoring_events_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scoring_events_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      predictions: {
        Row: {
          id: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          player_id: string;
          points_allocated: number;
          points_earned: number;
          locked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          player_id: string;
          points_allocated: number;
          points_earned?: number;
          locked_at?: string | null;
          created_at?: string;
        };
        Update: {
          points_allocated?: number;
          points_earned?: number;
          locked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "predictions_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "predictions_player_id_fkey";
            columns: ["player_id"];
            isOneToOne: false;
            referencedRelation: "players";
            referencedColumns: ["id"];
          }
        ];
      };
      league_player_values: {
        Row: {
          id: string;
          league_id: string;
          player_id: string;
          value: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          player_id: string;
          value?: number;
          updated_at?: string;
        };
        Update: {
          value?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      season_predictions: {
        Row: {
          id: string;
          league_id: string;
          team_id: string;
          category: string;
          answer: string | null;
          is_correct: boolean | null;
          points_earned: number;
          locked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          team_id: string;
          category: string;
          answer?: string | null;
          is_correct?: boolean | null;
          points_earned?: number;
          locked_at?: string | null;
          created_at?: string;
        };
        Update: {
          answer?: string | null;
          is_correct?: boolean | null;
          points_earned?: number;
          locked_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "season_predictions_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "season_predictions_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
      title_picks: {
        Row: {
          id: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          player_id: string | null;
          points_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          player_id?: string | null;
          points_earned?: number;
          created_at?: string;
        };
        Update: {
          player_id?: string | null;
          points_earned?: number;
        };
        Relationships: [];
      };
      episode_team_scores: {
        Row: {
          id: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          challenge_points: number;
          milestone_points: number;
          prediction_points: number;
          total_points: number;
          cumulative_total: number;
          rank: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          league_id: string;
          episode_id: string;
          team_id: string;
          challenge_points?: number;
          milestone_points?: number;
          prediction_points?: number;
          total_points?: number;
          cumulative_total?: number;
          rank?: number | null;
          created_at?: string;
        };
        Update: {
          challenge_points?: number;
          milestone_points?: number;
          prediction_points?: number;
          total_points?: number;
          cumulative_total?: number;
          rank?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "episode_team_scores_league_id_fkey";
            columns: ["league_id"];
            isOneToOne: false;
            referencedRelation: "leagues";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episode_team_scores_episode_id_fkey";
            columns: ["episode_id"];
            isOneToOne: false;
            referencedRelation: "episodes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "episode_team_scores_team_id_fkey";
            columns: ["team_id"];
            isOneToOne: false;
            referencedRelation: "teams";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type ScoringCategory =
  | "tribe_reward"
  | "individual_reward"
  | "tribe_immunity"
  | "individual_immunity"
  | "second_place_immunity"
  | "merge"
  | "final_three"
  | "winner"
  | "episode_title"
  | "voted_out_prediction"
  | "confessional"
  | "idol_play"
  | "advantage"
  | "custom_bonus"
  | "tribal_vote_correct"
  | "found_idol"
  | "successful_idol_play"
  | "votes_received";

// Convenience row types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Season = Database["public"]["Tables"]["seasons"]["Row"];
export type Player = Database["public"]["Tables"]["players"]["Row"];
export type League = Database["public"]["Tables"]["leagues"]["Row"];
export type Team = Database["public"]["Tables"]["teams"]["Row"];
export type DraftPick = Database["public"]["Tables"]["draft_picks"]["Row"];
export type Episode = Database["public"]["Tables"]["episodes"]["Row"];
export type ScoringEvent =
  Database["public"]["Tables"]["scoring_events"]["Row"];
export type Prediction = Database["public"]["Tables"]["predictions"]["Row"];
export type EpisodeTeamScore =
  Database["public"]["Tables"]["episode_team_scores"]["Row"];
export type TitlePick = Database["public"]["Tables"]["title_picks"]["Row"];
export type LeaguePlayerValue = Database["public"]["Tables"]["league_player_values"]["Row"];
export type SeasonPrediction = Database["public"]["Tables"]["season_predictions"]["Row"];
