import json
from rest_framework import serializers


class JSONListField(serializers.ListField):
    def to_internal_value(self, data):
        # QueryDictから来るとリストになるので最初の要素だけ使う
        # QueryDictになるのはContent-Type: multipart/form-data または application/x-www-form-urlencoded の場合
        # （1つのキーに対して複数の値を保持できる場合）
        if isinstance(data, list) and len(data) == 1 and isinstance(data[0], str):
            data = data[0]
        if isinstance(data, str):
            try:
                data = json.loads(data)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid JSON format for prompt_variables.")
        return super().to_internal_value(data)
