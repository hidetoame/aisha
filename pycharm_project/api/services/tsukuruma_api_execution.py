import logging
import requests

from api.models.menu import Menu
from api.services.api_result import APIResult
from django_project.settings import TSUKURUMA_API_HOST, TSUKURUMA_API_PORT, APP_NAME, EXE_ENV

logger = logging.getLogger(__name__)
url_base = f"http://{TSUKURUMA_API_HOST}:{TSUKURUMA_API_PORT}/api/images/"


def generate_or_edit(
        instance: Menu,
        image,
        additional_prompt_for_my_car,
        additional_prompt_for_others,
        aspect_ratio,
        prompt_variables: list[dict[str, str]] | None) \
        -> tuple[APIResult, str]:
    # プロンプトに変数を埋め込み
    prompt_formatted = instance.prompt
    for prompt_variable_menu in instance.prompt_variables.all():
        # 対応する変数のkeyが見つかればリクエストされたvalueを埋め込む（Serializerで存在チェック済）
        value = None
        for prompt_variable_requested in prompt_variables or []:
            if prompt_variable_menu.key == prompt_variable_requested['key']:
                value = prompt_variable_requested['value']
                break
        prompt_formatted = prompt_formatted.replace('{{' + prompt_variable_menu.key + '}}', value)
    # プロンプトに追加
    if additional_prompt_for_my_car:
        prompt_formatted += f"\n【愛車情報】\n{additional_prompt_for_my_car}"
    if additional_prompt_for_others:
        prompt_formatted += f"\n【追加情報】\n{additional_prompt_for_others}"

    # API実行
    if image:
        result = edit(prompt_formatted, instance, image)
    else:
        result = generate(prompt_formatted, instance, aspect_ratio)

    return result, prompt_formatted


def generate(prompt_formatted: str, instance: Menu, aspect_ratio) -> APIResult:
    url = f"{url_base}generate/"
    headers = {
        "Content-Type": "application/json"
    }
    params = {
        'generator_name': instance.engine,
        'prompt': prompt_formatted,
        'num_images': 1,
        'created_by': APP_NAME,
        'exe_env': EXE_ENV,
    }
    if instance.negative_prompt:
        params["negative_prompt"] = instance.negative_prompt
    if aspect_ratio:
        params["aspect_ratio"] = aspect_ratio

    try:
        response = requests.post(url, headers=headers, json=params)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        error_msg = f"Tsukuruma API execution error: {str(e)}"
        logger.exception(error_msg)
        return APIResult(error=error_msg, status_code=500)

    return APIResult(data=response.json(), status_code=response.status_code)


def edit(prompt_formatted: str, instance: Menu, image):
    url = f"{url_base}edit/"
    params = {
        'editor_name': instance.engine,
        'prompt': prompt_formatted,
        'num_images': 1,
        'created_by': APP_NAME,
        'exe_env': EXE_ENV,
    }

    files = {
        "image": (image.name, image.read(), image.content_type)
    }

    try:
        response = requests.post(url, data=params, files=files)
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        error_msg = f"Tsukuruma API execution error: {str(e)}"
        logger.exception(error_msg)
        return APIResult(error=error_msg, status_code=500)

    return APIResult(data=response.json(), status_code=response.status_code)
