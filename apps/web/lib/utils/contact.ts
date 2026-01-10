import { TContactAttributes } from "@hivecfm/types/contact-attribute";
import { TResponseContact } from "@hivecfm/types/responses";

export const getContactIdentifier = (
  contact: TResponseContact | null,
  contactAttributes: TContactAttributes | null
): string => {
  return contactAttributes?.email || contact?.userId || "";
};
