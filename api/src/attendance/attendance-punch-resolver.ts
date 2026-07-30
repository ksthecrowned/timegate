import {
  DayPunchState,
  PunchResolution,
  ResolvedPunchWindows,
} from './punch-window.types';

function inWindow(min: number, start: number, end: number): boolean {
  if (end >= start) {
    return min >= start && min <= end;
  }
  return min >= start || min <= end;
}

function afterWindowEnd(min: number, end: number): boolean {
  return min > end;
}

function beforeWindowStart(min: number, start: number): boolean {
  return min < start;
}

/** Machine à états pointage — Lot B (v1, sans chevauchement minuit). */
export function resolveAttendancePunch(
  atMin: number,
  windows: ResolvedPunchWindows,
  state: DayPunchState,
): PunchResolution {
  const {
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
    state.checkInAtMin > breakEndMin;

  if (!state.hasCheckIn) {
    if (beforeWindowStart(atMin, checkInStartMin)) {
      return {
        action: 'REJECTED',
        message: "Pointage trop tôt. La fenêtre d'arrivée n'est pas encore ouverte.",
      };
    }
    if (
      !allowCheckInAfterBreakStart &&
      breakStartMin != null &&
      atMin >= breakStartMin
    ) {
      return {
        action: 'REJECTED',
        message:
          "Pointage d'arrivée non autorisé après le début de la pause. Veuillez contacter le manager.",
      };
    }
    if (afterWindowEnd(atMin, checkInEndMin)) {
      return {
        action: 'CHECK_IN',
        message: "Pointage d'arrivée enregistré (retard — journée marquée à contrôler).",
        lateAbsent: true,
      };
    }
    if (inWindow(atMin, checkInStartMin, checkInEndMin)) {
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
    inWindow(atMin, breakStartMin, breakEndMin)
  ) {
    return {
      action: 'NONE',
      message: 'Pause en cours. Reprise possible après la fin de la plage pause.',
    };
  }

  if (
    !skipBreakResume &&
    breakEndMin != null &&
    atMin > breakEndMin &&
    atMin < shiftEndMin
  ) {
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

  if (atMin < checkOutStartMin) {
    if (inWindow(atMin, checkInStartMin, checkInEndMin)) {
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

  if (inWindow(atMin, checkOutStartMin, checkOutEndMin)) {
    const inferBreakEnd =
      !skipBreakResume &&
      !state.hasBreakEnd &&
      breakEndMin != null &&
      state.checkInAtMin != null &&
      state.checkInAtMin <= breakEndMin;

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
