/**
 * Named typography roles — map product language to the `typography` scale.
 * Use these in new code for predictable hierarchy (`typeRoles.pageTitle`, etc.).
 */
import { typography } from './typography';

export const typeRoles = {
  pageTitle: typography.screenTitle,
  /** Stack / modal chrome title */
  navTitle: typography.navTitle,
  sectionHeader: typography.sectionTitle,
  sectionLabel: typography.sectionLabel,
  cardTitle: typography.h4,
  subtitle: typography.subtitle,
  body: typography.body,
  bodySmall: typography.bodySmall,
  metadata: typography.metadata,
  badge: typography.label,
  button: typography.button,
  tab: typography.h5,
  caption: typography.caption,
  stat: typography.stat,
} as const;
