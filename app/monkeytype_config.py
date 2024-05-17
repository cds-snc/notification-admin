import os

from monkeytype.config import DefaultConfig


class MonkeytypeConfig(DefaultConfig):
    def __init__(self, package_prefixes):
        self.package_prefixes = package_prefixes

    def code_filter(self, code):
        # Get the module name from the code object
        # and convert the file path to a module name
        module_name = code.co_filname.replace(os.path.sep, ".")[:-3]

        for prefix in self.package_prefixes:
            if module_name.startswith(prefix):
                return True

        return False
