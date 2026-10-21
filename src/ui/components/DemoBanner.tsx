import { useTranslation } from 'react-i18next';
import { useServices } from '../../app/ServicesContext';

/** Aviso permanente: la app está en fase 1 y nada tiene validez legal. */
export function DemoBanner() {
  const { t } = useTranslation();
  const { config } = useServices();
  return (
    <div
      role="note"
      data-testid="demo-banner"
      className="bg-amber-100 px-4 py-1.5 text-center text-xs font-medium text-amber-900"
    >
      {t(`banner.${config.mode}`)} · {t('banner.notLegal')}
    </div>
  );
}
