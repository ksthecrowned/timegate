import {
  afterMinuteWindowEnd,
  beforeMinuteWindowStart,
  inMinuteWindow,
  isOvernightShift,
  minutesSinceOrigin,
} from '../common/utils/punch-time.util';
import {
  DayPunchState,
  PunchResolution,
  ResolvedPunchWindows,
} from './punch-window.types';

/** Machine à états pointage — Lot B (fenêtres wrap-aware, y compris chevauchement minuit). */
export function resolveAttendancePunch(
  atMin: number,
  windows: ResolvedPunchWindows,
  state: DayPunchState,
): PunchResolution {
  const {
    shiftStartMin,
    shiftEndMin,
    checkInStartMin,
    checkInEndMin,
    checkOutStartMin,
    checkOutEndMin,
    breakStartMin,
    breakEndMin,
  } = windows;
  const allowCheckInAfterBreakStart = windows.allowCheckInAfterBreakStart;

  const skipBreakResume =
    state.checkInAtMin != null &&
    breakEndMin != null &&
    minutesSinceOrigin(state.checkInAtMin, shiftStartMin) >
      minutesSinceOrigin(breakEndMin, shiftStartMin);

  if (!state.hasCheckIn) {
    if (beforeMinuteWindowStart(atMin, checkInStartMin, checkInEndMin)) {
      return {
        action: 'REJECTED',
        message: "Pointage trop tôt. La fenêtre d'arrivée n'est pas encore ouverte.",
      };
    }
    if (
      !allowCheckInAfterBreakStart &&
      breakStartMin != null &&
      minutesSinceOrigin(atMin, shiftStartMin) >=
        minutesSinceOrigin(breakStartMin, shiftStartMin)
    ) {
      return {
        action: 'REJECTED',
        message:
          "Pointage d'arrivée non autorisé après le début de la pause. Veuillez contacter le manager.",
      };
    }
    if (afterMinuteWindowEnd(atMin, checkInStartMin, checkInEndMin)) {
      return {
        action: 'CHECK_IN',
        message: "Pointage d'arrivée enregistré (retard — journée marquée à contrôler).",
        lateAbsent: true,
      };
    }
    if (inMinuteWindow(atMin, checkInStartMin, checkInEndMin)) {
      return {
        action: 'CHECK_IN',
        message: "Pointage d'arrivée enregistré.",
      };
    }
    return {
      action: 'REJECTED',
      message: "Hors fenêtre de pointage. Aucun enregistrement effectué.",
    };
  }

  if (state.hasCheckOut) {
    return {
      action: 'NONE',
      message: "Pointage de fin déjà enregistré pour aujourd'hui.",
    };
  }

  if (
    breakStartMin != null &&
    breakEndMin != null &&
    inMinuteWindow(atMin, breakStartMin, breakEndMin)
  ) {
    return {
      action: 'NONE',
      message: 'Pause en cours. Reprise possible à la fin de la pause.',
    };
  }

  if (
    !skipBreakResume &&
    breakEndMin != null
  ) {
    const sinceAt = minutesSinceOrigin(atMin, shiftStartMin);
    const sinceBreakEnd = minutesSinceOrigin(breakEndMin, shiftStartMin);
    const sinceShiftEnd = minutesSinceOrigin(shiftEndMin, shiftStartMin);
    if (sinceAt > sinceBreakEnd && sinceAt < sinceShiftEnd) {
      if (!state.hasBreakEnd) {
        return {
          action: 'BREAK_END',
          message: 'Reprise de pause enregistrée.',
        };
      }
      return {
        action: 'NONE',
        message: 'Reprise de pause déjà enregistrée.',
      };
    }
  }

  if (beforeMinuteWindowStart(atMin, checkOutStartMin, checkOutEndMin)) {
    if (inMinuteWindow(atMin, checkInStartMin, checkInEndMin)) {
      return {
        action: 'NONE',
        message: 'Arrivée déjà enregistrée.',
      };
    }
    return {
      action: 'REJECTED',
      message: 'Départ anticipé non autorisé au kiosque. Utilisez une réclamation.',
    };
  }

  if (inMinuteWindow(atMin, checkOutStartMin, checkOutEndMin)) {
    const inferBreakEnd =
      !skipBreakResume &&
      !state.hasBreakEnd &&
      breakEndMin != null &&
      state.checkInAtMin != null &&
      minutesSinceOrigin(state.checkInAtMin, shiftStartMin) <=
        minutesSinceOrigin(breakEndMin, shiftStartMin);

    return {
      action: 'CHECK_OUT',
      message: 'Pointage de fin enregistré.',
      inferBreakEnd,
    };
  }

  return {
    action: 'REJECTED',
    message: "Hors fenêtre de pointage. Aucun enregistrement effectué.",
  };
}

// Re-export for call sites / tests that previously relied on local helpers.
export { isOvernightShift };
