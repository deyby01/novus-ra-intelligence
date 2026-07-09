import django.db.models.deletion
from django.db import migrations, models


def backfill_report_organization(apps, schema_editor):
    """Copy each report's organization from its dataset before the FK is required."""
    Report = apps.get_model("reports", "Report")
    for report in Report.objects.select_related("dataset").iterator():
        report.organization_id = report.dataset.organization_id
        report.save(update_fields=["organization"])


class Migration(migrations.Migration):

    dependencies = [
        ("organizations", "0001_initial"),
        ("reports", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="report",
            name="organization",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="%(app_label)s_%(class)s_set",
                to="organizations.organization",
            ),
        ),
        migrations.RunPython(
            backfill_report_organization,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="report",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="%(app_label)s_%(class)s_set",
                to="organizations.organization",
            ),
        ),
    ]
