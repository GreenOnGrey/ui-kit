import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { useKitT } from "../i18n";
import { AgentMenu, type AgentModelOption, type AgentOption } from "./AgentMenu";
import { tokens } from "./ContextMeter";

/** A model the agent can run on, as the service of the agent gives it
 * (FTR.NAB.CHAT-0001 tech §2.2: `availableModels`, `model`, `defaultModel`). */
export interface AgentModel {
  connectionId: string;
  model: string;
  name: string;
  /** The connection the model comes through: grey under its name. */
  connection: string;
  caps: { image: boolean; reasoning: boolean; contextWindow: number };
}

/** What the user chose; null — the default model. */
export type AgentModelChoice = Pick<AgentModel, "connectionId" | "model"> | null;

/** The models of the agent for the block «Model». */
export interface AgentModelState {
  available: AgentModel[];
  /** The model in use. */
  model: AgentModel | null;
  defaultModel: AgentModel | null;
  /** The user chose the model; false — the default one. */
  chosen: boolean;
  /** The fill of the context of the main conversation, in tokens. */
  contextTokens: number;
}

/** The key of a model of a connection in the menu. */
export const agentModelKey = (m: Pick<AgentModel, "connectionId" | "model">) => `${m.connectionId}/${m.model}`;

/** The lines of the block «Model» (FTR.NAB.CHAT-0001 R16, R17, design §3.3): with a
 * choice the first line is «Default» with the default model under it; a model
 * whose window the context outgrows warns; one model is shown without a choice. */
export function agentModelOptions(t: TFunction, lng: string, s: AgentModelState): { options: AgentModelOption[]; value: string } {
  const badges = (m: AgentModel) => [
    ...(m.caps.image ? [{ icon: "image" as const, text: t("agent.capImage") }] : []),
    ...(m.caps.reasoning ? [{ icon: "brain" as const, text: t("agent.capReasoning") }] : []),
    ...(m.caps.contextWindow > 0 ? [{ text: tokens(m.caps.contextWindow, lng) }] : []),
  ];
  // R17: a context larger than 80 % of the window will be compacted
  const warn = (m: AgentModel) =>
    m.caps.contextWindow > 0 && s.contextTokens > 0.8 * m.caps.contextWindow ? t("agent.modelCompactWarn") : undefined;
  const choice = s.available.length > 1;
  const models: AgentModelOption[] = s.available.map((m) => ({
    key: agentModelKey(m), label: m.name, sub: m.connection, badges: badges(m), warn: choice ? warn(m) : undefined,
  }));
  const options: AgentModelOption[] = choice
    ? [{ key: "", label: t("agent.modelDefault"), sub: s.defaultModel?.name ?? "—", warn: s.defaultModel ? warn(s.defaultModel) : undefined }, ...models]
    : models;
  const value = s.chosen && s.model ? agentModelKey(s.model) : choice ? "" : (s.model ? agentModelKey(s.model) : "");
  return { options, value };
}

/** The menu of the agent, the same in every product (FTR.NAB.CMN-0005 R15;
 * FTR.HMR.SPEC-0001): the name, the options of the product as tiles in two
 * columns, the model when the product gives `models`, and the hint. What the
 * options mean only the product knows (R7): it passes them with their icons. The
 * strings are the kit's; `hint` replaces the hint of the kit where the product
 * saves the agent elsewhere. */
export function AgentSettingsMenu({ name, value, options, models, hint, onRename, onPick, onModel, onClose }: {
  name: string;
  value: string;
  options: AgentOption[];
  models?: AgentModelState;
  hint?: ReactNode;
  onRename: (name: string) => void;
  onPick: (key: string) => void;
  onModel?: (choice: AgentModelChoice) => void;
  /** Must keep its identity between renders. */
  onClose: () => void;
}) {
  const t = useKitT();
  const { i18n } = useTranslation();
  const block = models && onModel ? agentModelOptions(t, i18n.language, models) : null;
  const pickModel = (key: string) => {
    if (!models || !onModel) return;
    if (!key) return onModel(null);
    const m = models.available.find((x) => agentModelKey(x) === key);
    if (m) onModel({ connectionId: m.connectionId, model: m.model });
  };
  return (
    <AgentMenu label={t("agent.menu")} name={name} value={value} optionsLabel={t("agent.options")} hint={hint ?? t("agent.everywhere")}
      options={options}
      models={block ? { label: t("agent.model"), options: block.options, value: block.value, onPick: pickModel, empty: t("agent.noModels") } : undefined}
      onRename={onRename} onPick={onPick} onClose={onClose} />
  );
}
