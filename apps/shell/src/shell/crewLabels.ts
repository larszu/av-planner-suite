import { BOOKING_STATE_LABEL, type BookingState } from '@avplan/crew-core'
import type { TFunc } from '../i18n'

/**
 * Die Beschriftung der Buchungsstaende fuer Karte und Editor.
 *
 * Die deutsche Fassung ist die des Pakets (`BOOKING_STATE_LABEL`): die Shell
 * fuehrt kein zweites Vokabular fuer dieselben vier Zustaende, nur die
 * englische Uebersetzung im Woerterbuch.
 */
export const buchungsLabel = (t: TFunc): Record<BookingState, string> => ({
  pencil: t('overview.crew.booking.pencil', BOOKING_STATE_LABEL.pencil),
  hold: t('overview.crew.booking.hold', BOOKING_STATE_LABEL.hold),
  confirmed: t('overview.crew.booking.confirmed', BOOKING_STATE_LABEL.confirmed),
  worked: t('overview.crew.booking.worked', BOOKING_STATE_LABEL.worked),
})
