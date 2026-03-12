import { useTranslation } from "react-i18next";

export function FormbricksBranding() {
  const { t } = useTranslation();
  return (
    <span className="flex justify-center">
      <p className="text-signature text-xs">
        {t("common.powered_by")}{" "}
        <b>
          <span className="text-branding-text">HiveCFM</span>
        </b>
      </p>
    </span>
  );
}
