from flask_babel import _
from flask_babel import lazy_gettext as _l


class TemplateList():

    def __init__(
        self,
        service,
        template_type='all',
        template_folder_id=None,
        user=None,
    ):
        self.service = service
        self.template_type = template_type
        self.template_folder_id = template_folder_id
        self.user = user

    def __iter__(self):
        for item in self.get_templates_and_folders(
            self.template_type, self.template_folder_id, self.user, ancestors=[]
        ):
            yield item

    def get_templates_and_folders(self, template_type, template_folder_id, user, ancestors):

        for item in self.service.get_template_folders(
            template_type, template_folder_id, user,
        ):
            yield TemplateListFolder(
                item,
                folders=self.service.get_template_folders(
                    template_type, item['id'], user
                ),
                templates=self.service.get_templates(
                    template_type, item['id']
                ),
                ancestors=ancestors,
                service_id=self.service.id,
            )
            for sub_item in self.get_templates_and_folders(
                template_type, item['id'], user, ancestors + [item]
            ):
                yield sub_item

        for item in self.service.get_templates(
            template_type, template_folder_id, user
        ):
            yield TemplateListTemplate(
                item,
                ancestors=ancestors,
                service_id=self.service.id,
            )

    @property
    def as_id_and_name(self):
        return [(item.id, item.name) for item in self]

    @property
    def templates_to_show(self):
        return any(self)

    @property
    def folder_is_empty(self):
        return not any(self.get_templates_and_folders(
            'all', self.template_folder_id, self.user, []
        ))


class TemplateLists():

    def __init__(self, user):
        self.services = sorted(
            user.services,
            key=lambda service: service.name.lower(),
        )
        self.user = user

    def __iter__(self):

        if len(self.services) == 1:

            for template_or_folder in TemplateList(self.services[0], user=self.user):
                yield template_or_folder

            return

        for service in self.services:

            template_list_service = TemplateListService(service)

            yield template_list_service

            for service_templates_and_folders in TemplateList(
                service, user=self.user
            ).get_templates_and_folders(
                template_type='all',
                template_folder_id=None,
                user=self.user,
                ancestors=[template_list_service],
            ):
                yield service_templates_and_folders

    @property
    def templates_to_show(self):
        return bool(self.services)


class TemplateListItem():

    is_service = False

    def __init__(
        self,
        template_or_folder,
        ancestors,
    ):
        self.id = template_or_folder['id']
        self.name = template_or_folder['name']
        self.ancestors = ancestors


class TemplateListTemplate(TemplateListItem):

    is_folder = False

    def __init__(
        self,
        template,
        ancestors,
        service_id,
    ):
        super().__init__(template, ancestors)
        self.service_id = service_id
        self.hint = {
            'email': _l('Email template'),
            'sms': _l('Text message template'),
            'letter': _l('Letter template'),
        }.get(template['template_type'])


class TemplateListFolder(TemplateListItem):

    is_folder = True

    def __init__(
        self,
        folder,
        templates,
        folders,
        ancestors,
        service_id,
    ):
        super().__init__(folder, ancestors)
        self.service_id = service_id
        self.number_of_templates = len(templates)
        self.number_of_folders = len(folders)

    @property
    def _hint_parts(self):

        if self.number_of_folders == self.number_of_templates == 0:
            yield 'Empty'  # These strings are wrapped later on in the html

        if self.number_of_templates == 1:
            yield '1 template'
        elif self.number_of_templates > 1:
            # this one still needs wrapping because we do not have unique keys for each x in "x templates"
            yield '{} '.format(self.number_of_templates) + _('templates')

        if self.number_of_folders == 1:
            yield '1 folder'
        elif self.number_of_folders > 1:
            yield '{} folders'.format(self.number_of_folders)

    @property
    def hint(self):
        return ', '.join(self._hint_parts)


class TemplateListService(TemplateListFolder):

    is_service = True

    def __init__(
        self,
        service,
    ):
        super().__init__(
            folder=service._dict,
            templates=service.get_templates(
                template_folder_id=None,
            ),
            folders=service.get_template_folders(
                parent_folder_id=None,
            ),
            ancestors=[],
            service_id=service.id,
        )
