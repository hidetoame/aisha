from django.core.management.base import BaseCommand
from django.core.management import call_command
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Run database migrations for production deployment'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting production database migration...'))
        
        try:
            # Apply migrations
            call_command('migrate', verbosity=2)
            self.stdout.write(self.style.SUCCESS('Database migrations completed successfully!'))
            
            # Show current migration status
            call_command('showmigrations', verbosity=2)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Migration failed: {str(e)}'))
            raise e