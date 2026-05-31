import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db/connection";
import SOSAlert from "@/lib/db/models/SOSAlert";
import { sendCriticalEscalationSMS, sendResolvedSMS, sendSurveyCompletedSMS } from "@/lib/sms";
import { alertEmitter, ALERT_EVENTS } from "@/lib/events";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const alert = await SOSAlert.findById(id).lean();
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ alert });
  } catch (error) {
    console.error("Get alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const update: Record<string, unknown> = {};

    if (body.status) {
      if (!["active", "responding", "resolved"].includes(body.status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      update.status = body.status;
      if (body.status === "resolved") update.resolvedAt = new Date();
    }

    if (body.severity) update.severity = body.severity;

    if (body.canSelfReach !== undefined) update.canSelfReach = body.canSelfReach;
    if (body.escalatedToCritical !== undefined) {
      update.escalatedToCritical = body.escalatedToCritical;
      if (body.escalatedToCritical) update.severity = "critical";
    }

    if (body.nearestHospital) update.nearestHospital = body.nearestHospital;

    if (body.survey) update.survey = body.survey;

    const alert = await SOSAlert.findByIdAndUpdate(id, update, { new: true }).lean();
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    const alertDoc = alert as any;

    if (body.escalatedToCritical === true) {
      alertEmitter.emit(ALERT_EVENTS.ALERT_ESCALATED, { alertId: id, timestamp: new Date().toISOString() });
      const coords = alertDoc.location?.coordinates || [0, 0];
      sendCriticalEscalationSMS(alertDoc.user?.emergencyContacts || [], {
        userName: alertDoc.user?.name || "Unknown",
        userPhone: alertDoc.user?.phone || "",
        bloodGroup: alertDoc.user?.bloodGroup,
        latitude: coords[1],
        longitude: coords[0],
        severity: "critical",
        vehicleNumber: alertDoc.user?.vehicleNumber,
        nearestHospital: alertDoc.nearestHospital?.name,
      }).catch((err) => console.error("[SMS] Escalation SMS failed:", err));
    }

    if (body.status === "resolved") {
      alertEmitter.emit(ALERT_EVENTS.ALERT_RESOLVED, { alertId: id, timestamp: new Date().toISOString() });
      sendResolvedSMS(
        alertDoc.user?.emergencyContacts || [],
        alertDoc.user?.name || "Unknown"
      ).catch((err) => console.error("[SMS] Resolution SMS failed:", err));
    }

    if (body.survey) {
      alertEmitter.emit(ALERT_EVENTS.SURVEY_SUBMITTED, { alertId: id, timestamp: new Date().toISOString() });
      const coords = alertDoc.location?.coordinates || [0, 0];
      sendSurveyCompletedSMS({
        userName: alertDoc.user?.name || "Unknown",
        userPhone: alertDoc.user?.phone || "",
        bloodGroup: body.survey.bloodGroup,
        latitude: coords[1],
        longitude: coords[0],
        severity: alertDoc.severity || "unknown",
        injuryLevel: body.survey.injuryLevel,
        numberOfPatients: body.survey.numberOfPatients,
        needAmbulance: body.survey.needAmbulance,
      }).catch((err) => console.error("[SMS] Survey SMS failed:", err));
    }

    alertEmitter.emit(ALERT_EVENTS.ALERT_UPDATED, { alertId: id, changes: Object.keys(update), timestamp: new Date().toISOString() });

    return NextResponse.json({ message: "Alert updated", alert, smsSent: true });
  } catch (error) {
    console.error("Update alert error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
