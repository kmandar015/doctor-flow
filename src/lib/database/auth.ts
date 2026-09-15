/**
 * Temporary Day 3 identity boundary. Replace this with the authenticated
 * doctor's ID once sign-in is introduced; API handlers never accept it from
 * the browser.
 */
export function getCurrentDoctorId() {
  return process.env.DOCTORFLOW_DEV_DOCTOR_ID ?? "doctor-meera-shah";
}
