"""Email service using aiosmtplib and Jinja2 templates."""

import logging
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape

logger = logging.getLogger(__name__)

TEMPLATE_DIR = Path(__file__).parent.parent / "email" / "templates"


def _get_jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )


class EmailService:
    def __init__(self, settings):
        self.settings = settings
        self.jinja = _get_jinja_env()

    async def _send(self, to: str, subject: str, html: str, text: str = "") -> None:
        """Send an email via SMTP with retry logic."""
        if not self.settings.SMTP_USER or not self.settings.SMTP_PASSWORD:
            logger.warning("SMTP credentials not configured — skipping email to %s", to)
            return

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.settings.SMTP_FROM_NAME} <{self.settings.SMTP_USER}>"
        msg["To"] = to

        if text:
            msg.attach(MIMEText(text, "plain"))
        msg.attach(MIMEText(html, "html"))

        for attempt in range(3):
            try:
                await aiosmtplib.send(
                    msg,
                    hostname=self.settings.SMTP_HOST,
                    port=self.settings.SMTP_PORT,
                    username=self.settings.SMTP_USER,
                    password=self.settings.SMTP_PASSWORD,
                    start_tls=True,
                )
                logger.info("Email sent to %s: %s", to, subject)
                return
            except Exception as e:
                logger.error("Email attempt %d failed for %s: %s", attempt + 1, to, e)
                if attempt == 2:
                    logger.error("All email attempts failed for %s", to)

    def _render(self, template_name: str, context: dict) -> str:
        tmpl = self.jinja.get_template(template_name)
        return tmpl.render(**context)

    def _fmt_dt(self, dt, tz_str: str) -> str:
        """Format a datetime for display in a given timezone."""
        try:
            from zoneinfo import ZoneInfo
            local = dt.astimezone(ZoneInfo(tz_str))
            return local.strftime("%A, %B %d, %Y at %I:%M %p %Z")
        except Exception:
            return str(dt)

    async def send_booking_confirmation(self, booking, event_type, host_user) -> None:
        try:
            frontend = self.settings.FRONTEND_URL
            ctx = {
                "booker_name": booking.booker_name,
                "event_title": event_type.title if event_type else "Meeting",
                "date_time": self._fmt_dt(booking.start_time, booking.booker_timezone),
                "duration": f"{event_type.duration_minutes} min" if event_type else "",
                "host_name": host_user.name if host_user else "Host",
                "meeting_url": booking.meeting_url or "",
                "reschedule_url": f"{frontend}/booking/{booking.uid}/reschedule",
                "cancel_url": f"{frontend}/booking/{booking.uid}/cancel",
                "app_name": self.settings.APP_NAME,
            }
            html = self._render("booking_confirmation.html", ctx)
            await self._send(
                booking.booker_email,
                f"✅ Confirmed: {ctx['event_title']} with {ctx['host_name']}",
                html,
            )
            # Also notify host
            if host_user and host_user.email:
                host_ctx = {**ctx, "booker_name": f"{booking.booker_name} ({booking.booker_email})"}
                host_html = self._render("booking_confirmation.html", host_ctx)
                await self._send(
                    host_user.email,
                    f"New booking: {ctx['event_title']} with {booking.booker_name}",
                    host_html,
                )
        except Exception as e:
            logger.error("Error sending confirmation email: %s", e)

    async def send_booking_cancellation(self, booking, event_type, host_user) -> None:
        try:
            frontend = self.settings.FRONTEND_URL
            ctx = {
                "booker_name": booking.booker_name,
                "event_title": event_type.title if event_type else "Meeting",
                "date_time": self._fmt_dt(booking.start_time, booking.booker_timezone),
                "reason": booking.cancellation_reason or "No reason provided",
                "book_again_url": f"{frontend}/{host_user.username if host_user else 'john'}/{event_type.slug if event_type else ''}",
                "app_name": self.settings.APP_NAME,
            }
            html = self._render("booking_cancellation.html", ctx)
            await self._send(
                booking.booker_email,
                f"❌ Cancelled: {ctx['event_title']}",
                html,
            )
        except Exception as e:
            logger.error("Error sending cancellation email: %s", e)

    async def send_booking_reschedule(self, booking, event_type, host_user, old_start, old_end) -> None:
        try:
            frontend = self.settings.FRONTEND_URL
            ctx = {
                "booker_name": booking.booker_name,
                "event_title": event_type.title if event_type else "Meeting",
                "old_date_time": self._fmt_dt(old_start, booking.booker_timezone),
                "new_date_time": self._fmt_dt(booking.start_time, booking.booker_timezone),
                "duration": f"{event_type.duration_minutes} min" if event_type else "",
                "cancel_url": f"{frontend}/booking/{booking.uid}/cancel",
                "app_name": self.settings.APP_NAME,
            }
            html = self._render("booking_reschedule.html", ctx)
            await self._send(
                booking.booker_email,
                f"🔄 Rescheduled: {ctx['event_title']}",
                html,
            )
        except Exception as e:
            logger.error("Error sending reschedule email: %s", e)
