#include "x_dbs_api.h"

#include <curl/curl.h>
#include <json-c/json.h>
#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

typedef struct {
    char* data;
    size_t size;
    long http_status;
} HttpResponse;

static char g_api_url[512] = "http://localhost:3002/api";
static char g_token[2048] = "";
static char g_current_username[XDBS_MAX_STRING] = "";
static char g_last_error[512] = "";
static CURL* g_curl = NULL;

static void set_error(const char* format, ...) {
    va_list args;

    va_start(args, format);
    vsnprintf(g_last_error, sizeof(g_last_error), format, args);
    va_end(args);
}

static void safe_copy(char* destination, size_t destination_size, const char* source) {
    if (!destination || destination_size == 0U) {
        return;
    }

    if (!source) {
        destination[0] = '\0';
        return;
    }

    strncpy(destination, source, destination_size - 1U);
    destination[destination_size - 1U] = '\0';
}

static void append_text(char* buffer, size_t buffer_size, size_t* length, const char* text) {
    int written = 0;

    if (!buffer || buffer_size == 0U || !length || !text || *length >= buffer_size - 1U) {
        return;
    }

    written = snprintf(buffer + *length, buffer_size - *length, "%s", text);
    if (written < 0) {
        return;
    }

    if ((size_t)written >= buffer_size - *length) {
        *length = buffer_size - 1U;
    } else {
        *length += (size_t)written;
    }
}

static void join_json_string_array(
    json_object* array,
    char* buffer,
    size_t buffer_size,
    const char* separator
) {
    size_t index = 0U;
    size_t length = 0U;
    size_t written = 0U;

    if (!buffer || buffer_size == 0U) {
        return;
    }

    buffer[0] = '\0';

    if (!array || !json_object_is_type(array, json_type_array)) {
        return;
    }

    length = json_object_array_length(array);
    for (index = 0U; index < length; ++index) {
        json_object* item = json_object_array_get_idx(array, index);
        const char* value = item ? json_object_get_string(item) : "";

        if (index > 0U && separator) {
            append_text(buffer, buffer_size, &written, separator);
        }
        append_text(buffer, buffer_size, &written, value ? value : "");
    }
}

static void add_optional_string(json_object* object, const char* key, const char* value) {
    if (!object || !key || !value) {
        return;
    }

    json_object_object_add(object, key, json_object_new_string(value));
}

static void add_string_or_null(
    json_object* object,
    const char* key,
    const char* value,
    int include_field
) {
    if (!object || !key || !include_field) {
        return;
    }

    if (value) {
        json_object_object_add(object, key, json_object_new_string(value));
    } else {
        json_object_object_add(object, key, NULL);
    }
}

static int strings_equal_ci(const char* left, const char* right) {
    unsigned char left_char = 0U;
    unsigned char right_char = 0U;

    if (!left || !right) {
        return 0;
    }

    while (*left != '\0' && *right != '\0') {
        left_char = (unsigned char)*left;
        right_char = (unsigned char)*right;

        if (tolower(left_char) != tolower(right_char)) {
            return 0;
        }

        ++left;
        ++right;
    }

    return *left == '\0' && *right == '\0';
}

static const char* normalize_history_action(const char* action) {
    if (!action || action[0] == '\0') {
        return NULL;
    }

    if (strings_equal_ci(action, "creation")) {
        return "Creation";
    }
    if (strings_equal_ci(action, "modification")) {
        return "Modification";
    }
    if (strings_equal_ci(action, "suppression")) {
        return "Suppression";
    }
    if (strings_equal_ci(action, "connexion")) {
        return "Connexion";
    }
    if (strings_equal_ci(action, "deconnexion")) {
        return "Deconnexion";
    }
    if (strings_equal_ci(action, "reordonner")) {
        return "Reordonner";
    }
    if (strings_equal_ci(action, "deplacer")) {
        return "Deplacer";
    }

    return NULL;
}

static const char* normalize_history_entity(const char* entity) {
    if (!entity || entity[0] == '\0') {
        return NULL;
    }

    if (strings_equal_ci(entity, "product") || strings_equal_ci(entity, "produit")) {
        return "Produit";
    }
    if (strings_equal_ci(entity, "step")) {
        return "Step";
    }
    if (strings_equal_ci(entity, "sequence")) {
        return "Sequence";
    }
    if (strings_equal_ci(entity, "user")) {
        return "User";
    }

    return NULL;
}

static const char* resolve_history_username(const char* requested_username) {
    if (requested_username && requested_username[0] != '\0') {
        if (g_current_username[0] != '\0' && strings_equal_ci(requested_username, g_current_username)) {
            return g_current_username;
        }
        return requested_username;
    }

    return g_current_username[0] != '\0' ? g_current_username : NULL;
}

static void init_http_response(HttpResponse* response) {
    if (!response) {
        return;
    }

    response->data = NULL;
    response->size = 0U;
    response->http_status = 0L;
}

static void cleanup_http_response(HttpResponse* response) {
    if (!response) {
        return;
    }

    free(response->data);
    response->data = NULL;
    response->size = 0U;
    response->http_status = 0L;
}

static size_t write_callback(void* contents, size_t size, size_t nmemb, void* user_data) {
    size_t total_size = size * nmemb;
    HttpResponse* response = (HttpResponse*)user_data;
    char* new_data = NULL;

    if (!response) {
        return 0U;
    }

    new_data = (char*)realloc(response->data, response->size + total_size + 1U);
    if (!new_data) {
        return 0U;
    }

    response->data = new_data;
    memcpy(response->data + response->size, contents, total_size);
    response->size += total_size;
    response->data[response->size] = '\0';

    return total_size;
}

static int ensure_curl_initialized(void) {
    if (!g_curl) {
        if (curl_global_init(CURL_GLOBAL_DEFAULT) != CURLE_OK) {
            set_error("Unable to initialize libcurl");
            return -1;
        }

        g_curl = curl_easy_init();
        if (!g_curl) {
            set_error("Unable to create curl handle");
            curl_global_cleanup();
            return -1;
        }
    }

    return 0;
}

static void clear_request_error(void) {
    g_last_error[0] = '\0';
}

static void extract_json_message(const char* payload, char* buffer, size_t buffer_size) {
    json_object* root = NULL;
    json_object* message = NULL;

    if (!buffer || buffer_size == 0U) {
        return;
    }

    buffer[0] = '\0';

    if (!payload || payload[0] == '\0') {
        return;
    }

    root = json_tokener_parse(payload);
    if (!root) {
        safe_copy(buffer, buffer_size, payload);
        return;
    }

    if (json_object_object_get_ex(root, "message", &message)) {
        safe_copy(buffer, buffer_size, json_object_get_string(message));
    } else if (json_object_object_get_ex(root, "error", &message)) {
        safe_copy(buffer, buffer_size, json_object_get_string(message));
    } else {
        safe_copy(buffer, buffer_size, payload);
    }

    json_object_put(root);
}

static char* make_endpoint_with_escaped_segment(const char* prefix, const char* segment) {
    char* endpoint = NULL;
    char* escaped = NULL;
    size_t endpoint_length = 0U;

    if (!prefix || !segment) {
        set_error("Endpoint prefix and segment are required");
        return NULL;
    }

    if (ensure_curl_initialized() != 0) {
        return NULL;
    }

    escaped = curl_easy_escape(g_curl, segment, 0);
    if (!escaped) {
        set_error("Unable to escape URL segment");
        return NULL;
    }

    endpoint_length = strlen(prefix) + strlen(escaped) + 1U;
    endpoint = (char*)malloc(endpoint_length);
    if (!endpoint) {
        curl_free(escaped);
        set_error("Out of memory while building endpoint");
        return NULL;
    }

    snprintf(endpoint, endpoint_length, "%s%s", prefix, escaped);
    curl_free(escaped);

    return endpoint;
}

static int xdbs_request(
    const char* method,
    const char* endpoint,
    const char* body,
    HttpResponse* response
) {
    char url[1024];
    char auth_header[2304];
    char http_error[256];
    CURLcode result;
    long http_code = 0L;
    struct curl_slist* headers = NULL;

    if (!method || !endpoint || !response) {
        set_error("Invalid request arguments");
        return -1;
    }

    if (ensure_curl_initialized() != 0) {
        return -1;
    }

    init_http_response(response);
    clear_request_error();

    snprintf(url, sizeof(url), "%s%s", g_api_url, endpoint);

    curl_easy_reset(g_curl);

    headers = curl_slist_append(headers, "Accept: application/json");
    headers = curl_slist_append(headers, "Content-Type: application/json");

    if (g_token[0] != '\0') {
        snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", g_token);
        headers = curl_slist_append(headers, auth_header);
    }

    curl_easy_setopt(g_curl, CURLOPT_URL, url);
    curl_easy_setopt(g_curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(g_curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(g_curl, CURLOPT_WRITEDATA, response);
    curl_easy_setopt(g_curl, CURLOPT_TIMEOUT, 30L);
    curl_easy_setopt(g_curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(g_curl, CURLOPT_NOSIGNAL, 1L);

    if (strcmp(method, "GET") == 0) {
        curl_easy_setopt(g_curl, CURLOPT_HTTPGET, 1L);
    } else if (strcmp(method, "POST") == 0) {
        curl_easy_setopt(g_curl, CURLOPT_POST, 1L);
        curl_easy_setopt(g_curl, CURLOPT_POSTFIELDS, body ? body : "{}");
        curl_easy_setopt(g_curl, CURLOPT_POSTFIELDSIZE, (long)strlen(body ? body : "{}"));
    } else if (strcmp(method, "PUT") == 0) {
        curl_easy_setopt(g_curl, CURLOPT_CUSTOMREQUEST, "PUT");
        curl_easy_setopt(g_curl, CURLOPT_POSTFIELDS, body ? body : "{}");
        curl_easy_setopt(g_curl, CURLOPT_POSTFIELDSIZE, (long)strlen(body ? body : "{}"));
    } else if (strcmp(method, "DELETE") == 0) {
        curl_easy_setopt(g_curl, CURLOPT_CUSTOMREQUEST, "DELETE");
        if (body) {
            curl_easy_setopt(g_curl, CURLOPT_POSTFIELDS, body);
            curl_easy_setopt(g_curl, CURLOPT_POSTFIELDSIZE, (long)strlen(body));
        }
    } else {
        curl_slist_free_all(headers);
        set_error("Unsupported HTTP method: %s", method);
        return -1;
    }

    result = curl_easy_perform(g_curl);
    curl_easy_getinfo(g_curl, CURLINFO_RESPONSE_CODE, &http_code);
    response->http_status = http_code;

    curl_slist_free_all(headers);

    if (result != CURLE_OK) {
        set_error("Curl error: %s", curl_easy_strerror(result));
        return -1;
    }

    if (http_code >= 400L) {
        extract_json_message(response->data, http_error, sizeof(http_error));
        if (http_error[0] != '\0') {
            set_error("HTTP %ld: %s", http_code, http_error);
        } else {
            set_error("HTTP %ld", http_code);
        }
        return -1;
    }

    return 0;
}

static int xdbs_upload_file_request(
    const char* endpoint,
    const char* field_name,
    const char* file_path,
    HttpResponse* response
) {
    char url[1024];
    char auth_header[2304];
    char http_error[256];
    CURLcode result;
    long http_code = 0L;
    struct curl_slist* headers = NULL;
    curl_mime* mime = NULL;
    curl_mimepart* part = NULL;

    if (!endpoint || !field_name || !file_path || !response) {
        set_error("Invalid upload request arguments");
        return -1;
    }

    if (ensure_curl_initialized() != 0) {
        return -1;
    }

    init_http_response(response);
    clear_request_error();

    snprintf(url, sizeof(url), "%s%s", g_api_url, endpoint);

    curl_easy_reset(g_curl);

    headers = curl_slist_append(headers, "Accept: application/json");
    if (g_token[0] != '\0') {
        snprintf(auth_header, sizeof(auth_header), "Authorization: Bearer %s", g_token);
        headers = curl_slist_append(headers, auth_header);
    }

    mime = curl_mime_init(g_curl);
    if (!mime) {
        curl_slist_free_all(headers);
        set_error("Unable to initialize multipart upload");
        return -1;
    }

    part = curl_mime_addpart(mime);
    if (!part ||
        curl_mime_name(part, field_name) != CURLE_OK ||
        curl_mime_filedata(part, file_path) != CURLE_OK) {
        curl_mime_free(mime);
        curl_slist_free_all(headers);
        set_error("Unable to attach upload file");
        return -1;
    }

    curl_easy_setopt(g_curl, CURLOPT_URL, url);
    curl_easy_setopt(g_curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(g_curl, CURLOPT_MIMEPOST, mime);
    curl_easy_setopt(g_curl, CURLOPT_WRITEFUNCTION, write_callback);
    curl_easy_setopt(g_curl, CURLOPT_WRITEDATA, response);
    curl_easy_setopt(g_curl, CURLOPT_TIMEOUT, 60L);
    curl_easy_setopt(g_curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(g_curl, CURLOPT_NOSIGNAL, 1L);

    result = curl_easy_perform(g_curl);
    curl_easy_getinfo(g_curl, CURLINFO_RESPONSE_CODE, &http_code);
    response->http_status = http_code;

    curl_mime_free(mime);
    curl_slist_free_all(headers);

    if (result != CURLE_OK) {
        set_error("Curl error: %s", curl_easy_strerror(result));
        return -1;
    }

    if (http_code >= 400L) {
        extract_json_message(response->data, http_error, sizeof(http_error));
        if (http_error[0] != '\0') {
            set_error("HTTP %ld: %s", http_code, http_error);
        } else {
            set_error("HTTP %ld", http_code);
        }
        return -1;
    }

    return 0;
}

static int duplicate_params(const XDBS_Param* source, int count, XDBS_Param** destination) {
    XDBS_Param* copy = NULL;

    if (!destination) {
        set_error("Parameter array destination is required");
        return -1;
    }

    *destination = NULL;

    if (count <= 0) {
        return 0;
    }

    if (!source) {
        set_error("Parameter array source is missing");
        return -1;
    }

    copy = (XDBS_Param*)calloc((size_t)count, sizeof(XDBS_Param));
    if (!copy) {
        set_error("Out of memory while copying parameters");
        return -1;
    }

    memcpy(copy, source, (size_t)count * sizeof(XDBS_Param));
    *destination = copy;

    return 0;
}

static int duplicate_int_array(const int* source, int count, int** destination) {
    int* copy = NULL;

    if (!destination) {
        set_error("Integer array destination is required");
        return -1;
    }

    *destination = NULL;

    if (count <= 0) {
        return 0;
    }

    if (!source) {
        set_error("Integer array source is missing");
        return -1;
    }

    copy = (int*)calloc((size_t)count, sizeof(int));
    if (!copy) {
        set_error("Out of memory while copying integer array");
        return -1;
    }

    memcpy(copy, source, (size_t)count * sizeof(int));
    *destination = copy;

    return 0;
}

static int find_param_index_by_id(const XDBS_Param* params, int count, int param_id) {
    int index = 0;

    if (!params || count <= 0) {
        return -1;
    }

    for (index = 0; index < count; ++index) {
        if (params[index].id == param_id) {
            return index;
        }
    }

    return -1;
}

static int parse_param_array(json_object* array, XDBS_Param** params, int* count) {
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Param* parsed_params = NULL;

    if (!params || !count) {
        set_error("Invalid parameter array output");
        return -1;
    }

    *params = NULL;
    *count = 0;

    if (!array || !json_object_is_type(array, json_type_array)) {
        return 0;
    }

    length = json_object_array_length(array);
    if (length == 0U) {
        return 0;
    }

    parsed_params = (XDBS_Param*)calloc(length, sizeof(XDBS_Param));
    if (!parsed_params) {
        set_error("Out of memory while allocating params");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        json_object* item = json_object_array_get_idx(array, index);
        json_object* value = NULL;

        if (!item || !json_object_is_type(item, json_type_object)) {
            continue;
        }

        if (json_object_object_get_ex(item, "id", &value)) {
            parsed_params[index].id = json_object_get_int(value);
        }
        if (json_object_object_get_ex(item, "name", &value)) {
            safe_copy(parsed_params[index].name, sizeof(parsed_params[index].name), json_object_get_string(value));
        }
        if (json_object_object_get_ex(item, "type", &value)) {
            safe_copy(parsed_params[index].type, sizeof(parsed_params[index].type), json_object_get_string(value));
        }
        if (json_object_object_get_ex(item, "value", &value)) {
            safe_copy(parsed_params[index].value, sizeof(parsed_params[index].value), json_object_get_string(value));
        }
    }

    *params = parsed_params;
    *count = (int)length;

    return 0;
}

static int parse_int_array(json_object* array, int** values, int* count) {
    size_t index = 0U;
    size_t length = 0U;
    int* parsed_values = NULL;

    if (!values || !count) {
        set_error("Invalid integer array output");
        return -1;
    }

    *values = NULL;
    *count = 0;

    if (!array || !json_object_is_type(array, json_type_array)) {
        return 0;
    }

    length = json_object_array_length(array);
    if (length == 0U) {
        return 0;
    }

    parsed_values = (int*)calloc(length, sizeof(int));
    if (!parsed_values) {
        set_error("Out of memory while allocating integer array");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        json_object* item = json_object_array_get_idx(array, index);
        if (!item) {
            continue;
        }

        parsed_values[index] = json_object_get_int(item);
    }

    *values = parsed_values;
    *count = (int)length;

    return 0;
}

static int parse_sequence_status_array(
    json_object* array,
    XDBS_SequenceStepStatus** statuses,
    int* count
) {
    size_t index = 0U;
    size_t length = 0U;
    XDBS_SequenceStepStatus* parsed_statuses = NULL;

    if (!statuses || !count) {
        set_error("Invalid status array output");
        return -1;
    }

    *statuses = NULL;
    *count = 0;

    if (!array || !json_object_is_type(array, json_type_array)) {
        return 0;
    }

    length = json_object_array_length(array);
    if (length == 0U) {
        return 0;
    }

    parsed_statuses = (XDBS_SequenceStepStatus*)calloc(length, sizeof(XDBS_SequenceStepStatus));
    if (!parsed_statuses) {
        set_error("Out of memory while allocating step statuses");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        json_object* item = json_object_array_get_idx(array, index);
        json_object* value = NULL;

        if (!item || !json_object_is_type(item, json_type_object)) {
            continue;
        }

        if (json_object_object_get_ex(item, "stepId", &value)) {
            parsed_statuses[index].step_id = json_object_get_int(value);
        }
        if (json_object_object_get_ex(item, "status", &value)) {
            safe_copy(
                parsed_statuses[index].status,
                sizeof(parsed_statuses[index].status),
                json_object_get_string(value)
            );
        }
    }

    *statuses = parsed_statuses;
    *count = (int)length;

    return 0;
}

static void copy_json_string_field(
    json_object* object,
    const char* key,
    char* destination,
    size_t destination_size
) {
    json_object* value = NULL;

    if (!object || !key || !destination || destination_size == 0U) {
        return;
    }

    if (json_object_object_get_ex(object, key, &value) && value &&
        !json_object_is_type(value, json_type_null)) {
        safe_copy(destination, destination_size, json_object_get_string(value));
    }
}

static void copy_json_int_field(json_object* object, const char* key, int* destination) {
    json_object* value = NULL;

    if (!object || !key || !destination) {
        return;
    }

    if (json_object_object_get_ex(object, key, &value) && value &&
        !json_object_is_type(value, json_type_null)) {
        *destination = json_object_get_int(value);
    }
}

static void copy_json_bool_field(json_object* object, const char* key, int* destination) {
    json_object* value = NULL;

    if (!object || !key || !destination) {
        return;
    }

    if (json_object_object_get_ex(object, key, &value) && value &&
        !json_object_is_type(value, json_type_null)) {
        *destination = json_object_get_boolean(value) ? 1 : 0;
    }
}

static void copy_json_optional_int_field(
    json_object* object,
    const char* key,
    int* destination,
    int* has_value
) {
    json_object* value = NULL;

    if (!object || !key || !destination || !has_value) {
        return;
    }

    *has_value = 0;
    *destination = 0;

    if (json_object_object_get_ex(object, key, &value) && value &&
        !json_object_is_type(value, json_type_null)) {
        *destination = json_object_get_int(value);
        *has_value = 1;
    }
}

static int extract_response_id(const HttpResponse* response, int* id) {
    json_object* root = NULL;
    json_object* value = NULL;

    if (!id) {
        return 0;
    }

    *id = 0;

    if (!response || !response->data) {
        return 0;
    }

    root = json_tokener_parse(response->data);
    if (!root) {
        return 0;
    }

    if (json_object_object_get_ex(root, "id", &value) && value) {
        *id = json_object_get_int(value);
    }

    json_object_put(root);
    return 0;
}

typedef int (*XDBS_ParseObjectFn)(json_object* object, void* output);

static int xdbs_get_crud_list(
    const char* endpoint,
    size_t item_size,
    XDBS_ParseObjectFn parse_object,
    void** items,
    int* count
) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    char* parsed_items = NULL;

    if (!endpoint || item_size == 0U || !parse_object || !items || !count) {
        set_error("Invalid CRUD list arguments");
        return -1;
    }

    *items = NULL;
    *count = 0;

    if (xdbs_request("GET", endpoint, NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected CRUD list payload for %s", endpoint);
        return -1;
    }

    length = json_object_array_length(root);
    parsed_items = (char*)calloc(length, item_size);
    if (!parsed_items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating CRUD list");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_object(json_object_array_get_idx(root, index), parsed_items + (index * item_size)) != 0) {
            free(parsed_items);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *items = parsed_items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

static int xdbs_get_crud_item(
    const char* endpoint_prefix,
    int id,
    XDBS_ParseObjectFn parse_object,
    void* output
) {
    HttpResponse response;
    json_object* root = NULL;
    char endpoint[128];
    int request_status = 0;

    if (!endpoint_prefix || !parse_object || !output) {
        set_error("Invalid CRUD item arguments");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "%s/%d", endpoint_prefix, id);
    request_status = xdbs_request("GET", endpoint, NULL, &response);
    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_object(root, output) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected CRUD item payload for %s", endpoint);
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

static int xdbs_delete_crud_item(const char* endpoint_prefix, int id) {
    HttpResponse response;
    char endpoint[128];
    int request_status = 0;

    if (!endpoint_prefix) {
        set_error("Endpoint prefix is required");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "%s/%d", endpoint_prefix, id);
    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    cleanup_http_response(&response);

    return request_status;
}

static int xdbs_send_crud_payload(
    const char* method,
    const char* endpoint,
    json_object* payload,
    int* id
) {
    HttpResponse response;
    int request_status = 0;

    if (!method || !endpoint || !payload) {
        set_error("Invalid CRUD payload arguments");
        return -1;
    }

    request_status = xdbs_request(
        method,
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );
    if (request_status == 0) {
        extract_response_id(&response, id);
    }

    cleanup_http_response(&response);
    return request_status;
}

static void add_optional_int(json_object* object, const char* key, int value) {
    if (!object || !key || value < 0) {
        return;
    }

    json_object_object_add(object, key, json_object_new_int(value));
}

static void add_nullable_int(json_object* object, const char* key, int value) {
    if (!object || !key) {
        return;
    }

    if (value >= 0) {
        json_object_object_add(object, key, json_object_new_int(value));
    } else {
        json_object_object_add(object, key, NULL);
    }
}

static int parse_execution_mode_object(json_object* object, void* output) {
    XDBS_ExecutionMode* mode = (XDBS_ExecutionMode*)output;

    if (!object || !mode || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid execution mode payload");
        return -1;
    }

    memset(mode, 0, sizeof(*mode));
    copy_json_int_field(object, "id", &mode->id);
    copy_json_string_field(object, "name", mode->name, sizeof(mode->name));
    copy_json_string_field(object, "description", mode->description, sizeof(mode->description));
    copy_json_string_field(object, "created_at", mode->created_at, sizeof(mode->created_at));
    return 0;
}

static int parse_step_definition_object(json_object* object, void* output) {
    XDBS_StepDefinition* step = (XDBS_StepDefinition*)output;

    if (!object || !step || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid step definition payload");
        return -1;
    }

    memset(step, 0, sizeof(*step));
    copy_json_int_field(object, "id", &step->id);
    copy_json_string_field(object, "name", step->name, sizeof(step->name));
    copy_json_string_field(object, "description", step->description, sizeof(step->description));
    copy_json_optional_int_field(object, "depends_on", &step->depends_on, &step->has_depends_on);
    copy_json_string_field(object, "created_at", step->created_at, sizeof(step->created_at));
    return 0;
}

static int parse_step_param_definition_object(json_object* object, void* output) {
    XDBS_StepParamDefinition* param = (XDBS_StepParamDefinition*)output;

    if (!object || !param || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid step param payload");
        return -1;
    }

    memset(param, 0, sizeof(*param));
    copy_json_int_field(object, "id", &param->id);
    copy_json_int_field(object, "step_id", &param->step_id);
    copy_json_string_field(object, "param_name", param->param_name, sizeof(param->param_name));
    copy_json_string_field(object, "param_type", param->param_type, sizeof(param->param_type));
    copy_json_string_field(object, "default_value", param->default_value, sizeof(param->default_value));
    copy_json_string_field(object, "created_at", param->created_at, sizeof(param->created_at));
    return 0;
}

static int parse_step_limit_definition_object(json_object* object, void* output) {
    XDBS_StepLimitDefinition* limit = (XDBS_StepLimitDefinition*)output;

    if (!object || !limit || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid step limit payload");
        return -1;
    }

    memset(limit, 0, sizeof(*limit));
    copy_json_int_field(object, "id", &limit->id);
    copy_json_int_field(object, "step_id", &limit->step_id);
    copy_json_string_field(object, "limit_name", limit->limit_name, sizeof(limit->limit_name));
    copy_json_string_field(object, "limit_type", limit->limit_type, sizeof(limit->limit_type));
    copy_json_string_field(object, "comparison_type", limit->comparison_type, sizeof(limit->comparison_type));
    copy_json_string_field(object, "limit_value", limit->limit_value, sizeof(limit->limit_value));
    copy_json_string_field(object, "limit_min", limit->limit_min, sizeof(limit->limit_min));
    copy_json_string_field(object, "limit_max", limit->limit_max, sizeof(limit->limit_max));
    copy_json_string_field(object, "unit", limit->unit, sizeof(limit->unit));
    copy_json_string_field(object, "created_at", limit->created_at, sizeof(limit->created_at));
    return 0;
}

static int parse_sequence_definition_object(json_object* object, void* output) {
    XDBS_SequenceDefinition* sequence = (XDBS_SequenceDefinition*)output;

    if (!object || !sequence || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid sequence definition payload");
        return -1;
    }

    memset(sequence, 0, sizeof(*sequence));
    copy_json_int_field(object, "id", &sequence->id);
    copy_json_string_field(object, "name", sequence->name, sizeof(sequence->name));
    copy_json_string_field(object, "description", sequence->description, sizeof(sequence->description));
    copy_json_optional_int_field(object, "depends_on", &sequence->depends_on, &sequence->has_depends_on);
    copy_json_string_field(object, "created_at", sequence->created_at, sizeof(sequence->created_at));
    return 0;
}

static int parse_sequence_step_link_object(json_object* object, void* output) {
    XDBS_SequenceStepLink* link = (XDBS_SequenceStepLink*)output;

    if (!object || !link || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid sequence step payload");
        return -1;
    }

    memset(link, 0, sizeof(*link));
    copy_json_int_field(object, "id", &link->id);
    copy_json_int_field(object, "sequence_id", &link->sequence_id);
    copy_json_int_field(object, "step_id", &link->step_id);
    copy_json_int_field(object, "order_index", &link->order_index);
    copy_json_string_field(object, "created_at", link->created_at, sizeof(link->created_at));
    return 0;
}

static int parse_product_sequence_link_object(json_object* object, void* output) {
    XDBS_ProductSequenceLink* link = (XDBS_ProductSequenceLink*)output;

    if (!object || !link || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid product sequence payload");
        return -1;
    }

    memset(link, 0, sizeof(*link));
    copy_json_int_field(object, "id", &link->id);
    copy_json_int_field(object, "product_id", &link->product_id);
    copy_json_int_field(object, "sequence_id", &link->sequence_id);
    copy_json_int_field(object, "order_index", &link->order_index);
    copy_json_string_field(object, "created_at", link->created_at, sizeof(link->created_at));
    return 0;
}

static int parse_product_step_param_value_object(json_object* object, void* output) {
    XDBS_ProductStepParamValue* value = (XDBS_ProductStepParamValue*)output;

    if (!object || !value || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid product step param payload");
        return -1;
    }

    memset(value, 0, sizeof(*value));
    copy_json_int_field(object, "id", &value->id);
    copy_json_int_field(object, "product_id", &value->product_id);
    copy_json_int_field(object, "step_param_id", &value->step_param_id);
    copy_json_string_field(object, "value", value->value, sizeof(value->value));
    copy_json_string_field(object, "created_at", value->created_at, sizeof(value->created_at));
    return 0;
}

static int parse_product_execution_config_object(json_object* object, void* output) {
    XDBS_ProductExecutionConfig* config = (XDBS_ProductExecutionConfig*)output;

    if (!object || !config || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid product execution config payload");
        return -1;
    }

    memset(config, 0, sizeof(*config));
    copy_json_int_field(object, "id", &config->id);
    copy_json_int_field(object, "product_id", &config->product_id);
    copy_json_int_field(object, "execution_mode_id", &config->execution_mode_id);
    copy_json_optional_int_field(object, "sequence_id", &config->sequence_id, &config->has_sequence_id);
    copy_json_optional_int_field(object, "step_id", &config->step_id, &config->has_step_id);
    copy_json_bool_field(object, "is_active", &config->is_active);
    copy_json_bool_field(object, "ignore_fail", &config->ignore_fail);
    copy_json_int_field(object, "retry_on_fail", &config->retry_on_fail);
    copy_json_int_field(object, "repeat_count", &config->repeat_count);
    copy_json_int_field(object, "retry_delay_ms", &config->retry_delay_ms);
    copy_json_string_field(object, "created_at", config->created_at, sizeof(config->created_at));
    return 0;
}

static int parse_component_instance_object(json_object* object, void* output) {
    XDBS_ComponentInstance* instance = (XDBS_ComponentInstance*)output;

    if (!object || !instance || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid component instance payload");
        return -1;
    }

    memset(instance, 0, sizeof(*instance));
    copy_json_int_field(object, "id", &instance->id);
    copy_json_int_field(object, "product_id", &instance->product_id);
    copy_json_string_field(object, "product_name", instance->product_name, sizeof(instance->product_name));
    copy_json_int_field(object, "step_id", &instance->step_id);
    copy_json_string_field(object, "step_name", instance->step_name, sizeof(instance->step_name));
    copy_json_int_field(object, "instance_index", &instance->instance_index);
    copy_json_string_field(object, "instance_name", instance->instance_name, sizeof(instance->instance_name));
    copy_json_string_field(object, "description", instance->description, sizeof(instance->description));
    copy_json_string_field(object, "physical_ref", instance->physical_ref, sizeof(instance->physical_ref));
    copy_json_bool_field(object, "is_active", &instance->is_active);
    copy_json_string_field(object, "created_at", instance->created_at, sizeof(instance->created_at));
    return 0;
}

static int parse_product_step_limit_value_object(json_object* object, void* output) {
    XDBS_ProductStepLimitValue* value = (XDBS_ProductStepLimitValue*)output;

    if (!object || !value || !json_object_is_type(object, json_type_object)) {
        set_error("Invalid product step limit payload");
        return -1;
    }

    memset(value, 0, sizeof(*value));
    copy_json_int_field(object, "id", &value->id);
    copy_json_int_field(object, "component_instance_id", &value->component_instance_id);
    copy_json_int_field(object, "product_id", &value->product_id);
    copy_json_string_field(object, "product_name", value->product_name, sizeof(value->product_name));
    copy_json_int_field(object, "step_id", &value->step_id);
    copy_json_string_field(object, "step_name", value->step_name, sizeof(value->step_name));
    copy_json_int_field(object, "instance_index", &value->instance_index);
    copy_json_string_field(object, "instance_name", value->instance_name, sizeof(value->instance_name));
    copy_json_string_field(object, "physical_ref", value->physical_ref, sizeof(value->physical_ref));
    copy_json_int_field(object, "step_limit_id", &value->step_limit_id);
    copy_json_string_field(object, "limit_name", value->limit_name, sizeof(value->limit_name));
    copy_json_string_field(object, "limit_type", value->limit_type, sizeof(value->limit_type));
    copy_json_string_field(object, "comparison_type", value->comparison_type, sizeof(value->comparison_type));
    copy_json_string_field(object, "default_limit_value", value->default_limit_value, sizeof(value->default_limit_value));
    copy_json_string_field(object, "default_limit_min", value->default_limit_min, sizeof(value->default_limit_min));
    copy_json_string_field(object, "default_limit_max", value->default_limit_max, sizeof(value->default_limit_max));
    copy_json_string_field(object, "unit", value->unit, sizeof(value->unit));
    copy_json_string_field(object, "limit_value", value->limit_value, sizeof(value->limit_value));
    copy_json_string_field(object, "limit_min", value->limit_min, sizeof(value->limit_min));
    copy_json_string_field(object, "limit_max", value->limit_max, sizeof(value->limit_max));
    copy_json_bool_field(object, "is_active", &value->is_active);
    copy_json_optional_int_field(object, "execution_mode_id", &value->execution_mode_id, &value->has_execution_mode_id);
    copy_json_string_field(object, "mode_name", value->mode_name, sizeof(value->mode_name));
    copy_json_string_field(object, "created_at", value->created_at, sizeof(value->created_at));
    copy_json_string_field(object, "updated_at", value->updated_at, sizeof(value->updated_at));
    return 0;
}

static void reset_product(XDBS_Product* product) {
    if (product) {
        memset(product, 0, sizeof(*product));
    }
}

static void reset_step(XDBS_Step* step) {
    if (step) {
        memset(step, 0, sizeof(*step));
    }
}

static void reset_sequence(XDBS_Sequence* sequence) {
    if (sequence) {
        memset(sequence, 0, sizeof(*sequence));
    }
}

static void reset_user(XDBS_UserInfo* user) {
    if (user) {
        memset(user, 0, sizeof(*user));
    }
}

static void reset_role(XDBS_Role* role) {
    if (role) {
        memset(role, 0, sizeof(*role));
    }
}

static void reset_right(XDBS_Right* right) {
    if (right) {
        memset(right, 0, sizeof(*right));
    }
}

static void reset_history_entry(XDBS_HistoryEntry* entry) {
    if (entry) {
        memset(entry, 0, sizeof(*entry));
    }
}

static void init_pipeline(XDBS_Pipeline* pipeline) {
    if (!pipeline) {
        return;
    }

    pipeline->ids = NULL;
    pipeline->count = 0;
}

static int parse_product_object(json_object* object, XDBS_Product* product) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !product) {
        set_error("Invalid product payload");
        return -1;
    }

    reset_product(product);

    if (json_object_object_get_ex(object, "id", &value)) {
        product->id = json_object_get_int(value);
    }
    if (json_object_object_get_ex(object, "name", &value)) {
        safe_copy(product->name, sizeof(product->name), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "description", &value)) {
        safe_copy(product->description, sizeof(product->description), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdBy", &value)) {
        safe_copy(product->created_by, sizeof(product->created_by), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_by", &value)) {
        safe_copy(product->created_by, sizeof(product->created_by), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdAt", &value)) {
        safe_copy(product->created_at, sizeof(product->created_at), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(product->created_at, sizeof(product->created_at), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "params", &value) &&
        parse_param_array(value, &product->params, &product->param_count) != 0) {
        return -1;
    }
    if (json_object_object_get_ex(object, "preuutStepIds", &value) &&
        parse_int_array(value, &product->preuut_step_ids, &product->preuut_step_count) != 0) {
        return -1;
    }
    if (json_object_object_get_ex(object, "sequenceIds", &value) &&
        parse_int_array(value, &product->sequence_ids, &product->sequence_count) != 0) {
        return -1;
    }
    if (json_object_object_get_ex(object, "postuutStepIds", &value) &&
        parse_int_array(value, &product->postuut_step_ids, &product->postuut_step_count) != 0) {
        return -1;
    }

    return 0;
}

static int parse_step_object(json_object* object, XDBS_Step* step) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !step) {
        set_error("Invalid step payload");
        return -1;
    }

    reset_step(step);

    if (json_object_object_get_ex(object, "id", &value)) {
        step->id = json_object_get_int(value);
    }
    if (json_object_object_get_ex(object, "name", &value)) {
        safe_copy(step->name, sizeof(step->name), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "description", &value)) {
        safe_copy(step->description, sizeof(step->description), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdBy", &value)) {
        safe_copy(step->created_by, sizeof(step->created_by), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_by", &value)) {
        safe_copy(step->created_by, sizeof(step->created_by), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdAt", &value)) {
        safe_copy(step->created_at, sizeof(step->created_at), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(step->created_at, sizeof(step->created_at), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "params", &value) &&
        parse_param_array(value, &step->params, &step->param_count) != 0) {
        return -1;
    }

    return 0;
}

static int parse_sequence_object(json_object* object, XDBS_Sequence* sequence) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !sequence) {
        set_error("Invalid sequence payload");
        return -1;
    }

    reset_sequence(sequence);

    if (json_object_object_get_ex(object, "id", &value)) {
        sequence->id = json_object_get_int(value);
    }
    if (json_object_object_get_ex(object, "name", &value)) {
        safe_copy(sequence->name, sizeof(sequence->name), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "description", &value)) {
        safe_copy(sequence->description, sizeof(sequence->description), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdBy", &value)) {
        safe_copy(sequence->created_by, sizeof(sequence->created_by), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_by", &value)) {
        safe_copy(sequence->created_by, sizeof(sequence->created_by), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdAt", &value)) {
        safe_copy(sequence->created_at, sizeof(sequence->created_at), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(sequence->created_at, sizeof(sequence->created_at), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "stepIds", &value) &&
        parse_int_array(value, &sequence->step_ids, &sequence->step_count) != 0) {
        return -1;
    }
    if (json_object_object_get_ex(object, "stepStatuses", &value) &&
        parse_sequence_status_array(value, &sequence->step_statuses, &sequence->step_status_count) != 0) {
        return -1;
    }

    return 0;
}

static int parse_user_object(json_object* object, XDBS_UserInfo* user) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !user) {
        set_error("Invalid user payload");
        return -1;
    }

    reset_user(user);

    if (json_object_object_get_ex(object, "username", &value)) {
        safe_copy(user->username, sizeof(user->username), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "role", &value)) {
        safe_copy(user->role, sizeof(user->role), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "rights", &value)) {
        if (json_object_is_type(value, json_type_array)) {
            join_json_string_array(value, user->rights, sizeof(user->rights), ", ");
        } else {
            safe_copy(user->rights, sizeof(user->rights), json_object_get_string(value));
        }
    }
    if (json_object_object_get_ex(object, "status", &value)) {
        safe_copy(user->status, sizeof(user->status), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "email", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(user->email, sizeof(user->email), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "phone", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(user->phone, sizeof(user->phone), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "address", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(user->address, sizeof(user->address), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "avatar", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(user->avatar, sizeof(user->avatar), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "lastLogin", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(user->last_login, sizeof(user->last_login), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "createdAt", &value)) {
        safe_copy(user->created_at, sizeof(user->created_at), json_object_get_string(value));
    }

    return 0;
}

static int parse_role_object(json_object* object, XDBS_Role* role) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !role) {
        set_error("Invalid role payload");
        return -1;
    }

    reset_role(role);

    if (json_object_object_get_ex(object, "id_role", &value)) {
        safe_copy(role->id_role, sizeof(role->id_role), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "description", &value)) {
        safe_copy(role->description, sizeof(role->description), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "rights", &value)) {
        if (json_object_is_type(value, json_type_array)) {
            join_json_string_array(value, role->rights, sizeof(role->rights), ", ");
        } else {
            safe_copy(role->rights, sizeof(role->rights), json_object_get_string(value));
        }
    }
    if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(role->created_at, sizeof(role->created_at), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "updated_at", &value)) {
        safe_copy(role->updated_at, sizeof(role->updated_at), json_object_get_string(value));
    }

    return 0;
}

static int parse_right_object(json_object* object, XDBS_Right* right) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !right) {
        set_error("Invalid right payload");
        return -1;
    }

    reset_right(right);

    if (json_object_object_get_ex(object, "id_right", &value)) {
        safe_copy(right->id_right, sizeof(right->id_right), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "description", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(right->description, sizeof(right->description), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "module", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(right->module, sizeof(right->module), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(right->created_at, sizeof(right->created_at), json_object_get_string(value));
    }

    return 0;
}

static int parse_history_object(json_object* object, XDBS_HistoryEntry* entry) {
    json_object* value = NULL;

    if (!object || !json_object_is_type(object, json_type_object) || !entry) {
        set_error("Invalid history payload");
        return -1;
    }

    reset_history_entry(entry);

    if (json_object_object_get_ex(object, "id", &value)) {
        entry->id = json_object_get_int(value);
    }
    if (json_object_object_get_ex(object, "user", &value)) {
        safe_copy(entry->user_name, sizeof(entry->user_name), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "user_name", &value)) {
        safe_copy(entry->user_name, sizeof(entry->user_name), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "avatar", &value) && !json_object_is_type(value, json_type_null)) {
        safe_copy(entry->avatar, sizeof(entry->avatar), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "action", &value)) {
        safe_copy(entry->action, sizeof(entry->action), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "entity", &value)) {
        safe_copy(entry->entity, sizeof(entry->entity), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "entity_id", &value) && !json_object_is_type(value, json_type_null)) {
        entry->entity_id = json_object_get_int(value);
    }
    if (json_object_object_get_ex(object, "details", &value)) {
        safe_copy(entry->details, sizeof(entry->details), json_object_get_string(value));
    }
    if (json_object_object_get_ex(object, "date", &value)) {
        safe_copy(entry->created_at, sizeof(entry->created_at), json_object_get_string(value));
    } else if (json_object_object_get_ex(object, "created_at", &value)) {
        safe_copy(entry->created_at, sizeof(entry->created_at), json_object_get_string(value));
    }

    return 0;
}

static json_object* build_params_json_array(const XDBS_Param* params, int param_count) {
    int index = 0;
    json_object* array = json_object_new_array();

    if (!array) {
        return NULL;
    }

    if (param_count < 0 || (param_count > 0 && !params)) {
        json_object_put(array);
        return NULL;
    }

    for (index = 0; index < param_count; ++index) {
        json_object* item = json_object_new_object();
        char id_buffer[32];
        if (!item) {
            json_object_put(array);
            return NULL;
        }

        if (params[index].id > 0) {
            snprintf(id_buffer, sizeof(id_buffer), "%d", params[index].id);
            json_object_object_add(item, "id", json_object_new_string(id_buffer));
        }
        json_object_object_add(item, "name", json_object_new_string(params[index].name));
        json_object_object_add(item, "type", json_object_new_string(params[index].type));
        json_object_object_add(item, "value", json_object_new_string(params[index].value));
        json_object_array_add(array, item);
    }

    return array;
}

static json_object* build_int_json_array(const int* values, int count) {
    int index = 0;
    json_object* array = json_object_new_array();

    if (!array) {
        return NULL;
    }

    if (count < 0 || (count > 0 && !values)) {
        json_object_put(array);
        return NULL;
    }

    for (index = 0; index < count; ++index) {
        json_object_array_add(array, json_object_new_int(values[index]));
    }

    return array;
}

static json_object* build_string_json_array(const char* const* values, int count) {
    int index = 0;
    json_object* array = json_object_new_array();

    if (!array) {
        return NULL;
    }

    if (count < 0 || (count > 0 && !values)) {
        json_object_put(array);
        return NULL;
    }

    for (index = 0; index < count; ++index) {
        json_object_array_add(array, json_object_new_string(values[index] ? values[index] : ""));
    }

    return array;
}

static json_object* build_product_payload(
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count,
    const int* preuut_step_ids,
    int preuut_step_count,
    const int* sequence_ids,
    int sequence_count,
    const int* postuut_step_ids,
    int postuut_step_count
) {
    json_object* root = json_object_new_object();
    json_object* params_array = NULL;
    json_object* preuut_array = NULL;
    json_object* sequence_array = NULL;
    json_object* postuut_array = NULL;

    if (!root) {
        return NULL;
    }

    json_object_object_add(root, "name", json_object_new_string(name ? name : ""));
    json_object_object_add(root, "description", json_object_new_string(description ? description : ""));

    params_array = build_params_json_array(params, param_count);
    preuut_array = build_int_json_array(preuut_step_ids, preuut_step_count);
    sequence_array = build_int_json_array(sequence_ids, sequence_count);
    postuut_array = build_int_json_array(postuut_step_ids, postuut_step_count);

    if (!params_array || !preuut_array || !sequence_array || !postuut_array) {
        json_object_put(root);
        if (params_array) {
            json_object_put(params_array);
        }
        if (preuut_array) {
            json_object_put(preuut_array);
        }
        if (sequence_array) {
            json_object_put(sequence_array);
        }
        if (postuut_array) {
            json_object_put(postuut_array);
        }
        return NULL;
    }

    json_object_object_add(root, "params", params_array);
    json_object_object_add(root, "preuutStepIds", preuut_array);
    json_object_object_add(root, "sequenceIds", sequence_array);
    json_object_object_add(root, "postuutStepIds", postuut_array);

    return root;
}

static json_object* build_step_payload(
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count
) {
    json_object* root = json_object_new_object();
    json_object* params_array = NULL;

    if (!root) {
        return NULL;
    }

    json_object_object_add(root, "name", json_object_new_string(name ? name : ""));
    json_object_object_add(root, "description", json_object_new_string(description ? description : ""));

    params_array = build_params_json_array(params, param_count);
    if (!params_array) {
        json_object_put(root);
        return NULL;
    }

    json_object_object_add(root, "params", params_array);

    return root;
}

static json_object* build_sequence_payload(
    const char* name,
    const char* description,
    const int* step_ids,
    int step_count
) {
    json_object* root = json_object_new_object();
    json_object* step_ids_array = NULL;

    if (!root) {
        return NULL;
    }

    json_object_object_add(root, "name", json_object_new_string(name ? name : ""));
    json_object_object_add(root, "description", json_object_new_string(description ? description : ""));

    step_ids_array = build_int_json_array(step_ids, step_count);
    if (!step_ids_array) {
        json_object_put(root);
        return NULL;
    }

    json_object_object_add(root, "stepIds", step_ids_array);

    return root;
}

static int xdbs_update_user_avatar_internal(
    const char* username,
    const char* avatar_url,
    int clear_avatar
) {
    HttpResponse response;
    json_object* payload = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!username) {
        set_error("Username is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/users/", username);
    if (!endpoint) {
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        free(endpoint);
        set_error("Unable to allocate user update payload");
        return -1;
    }

    if (clear_avatar) {
        json_object_object_add(payload, "avatar", NULL);
    } else {
        json_object_object_add(payload, "avatar", json_object_new_string(avatar_url ? avatar_url : ""));
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_init(const char* api_url) {
    if (api_url && api_url[0] != '\0') {
        safe_copy(g_api_url, sizeof(g_api_url), api_url);
    }

    return ensure_curl_initialized();
}

int xdbs_login(const char* username, const char* password) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* root = NULL;
    json_object* token = NULL;
    json_object* user = NULL;
    json_object* username_obj = NULL;
    int request_status = 0;

    if (!username || !password) {
        set_error("Username and password are required");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate login payload");
        return -1;
    }

    json_object_object_add(payload, "username", json_object_new_string(username));
    json_object_object_add(payload, "password", json_object_new_string(password));

    request_status = xdbs_request(
        "POST",
        "/auth/login",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );
    json_object_put(payload);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_object_get_ex(root, "access_token", &token)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Login succeeded but no access token was returned");
        return -1;
    }

    safe_copy(g_token, sizeof(g_token), json_object_get_string(token));

    if (json_object_object_get_ex(root, "user", &user) &&
        json_object_is_type(user, json_type_object) &&
        json_object_object_get_ex(user, "username", &username_obj)) {
        safe_copy(g_current_username, sizeof(g_current_username), json_object_get_string(username_obj));
    } else {
        safe_copy(g_current_username, sizeof(g_current_username), username);
    }

    json_object_put(root);
    cleanup_http_response(&response);

    return g_token[0] == '\0' ? -1 : 0;
}

void xdbs_set_token(const char* token) {
    safe_copy(g_token, sizeof(g_token), token);
}

const char* xdbs_get_token(void) {
    return g_token;
}

const char* xdbs_get_last_error(void) {
    return g_last_error;
}

void xdbs_cleanup(void) {
    if (g_curl) {
        curl_easy_cleanup(g_curl);
        g_curl = NULL;
    }

    curl_global_cleanup();
    g_token[0] = '\0';
    g_current_username[0] = '\0';
}

int xdbs_get_products(XDBS_Product** products, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Product* items = NULL;

    if (!products || !count) {
        set_error("Products output pointers are required");
        return -1;
    }

    *products = NULL;
    *count = 0;

    if (xdbs_request("GET", "/products", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected products payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_Product*)calloc(length, sizeof(XDBS_Product));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating products");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_product_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            xdbs_free_products(items, (int)length);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *products = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);

    return 0;
}

int xdbs_get_product_by_id(int id, XDBS_Product* product) {
    HttpResponse response;
    json_object* root = NULL;
    char endpoint[64];

    if (!product) {
        set_error("Product output pointer is required");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "/products/%d", id);

    if (xdbs_request("GET", endpoint, NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_product_object(root, product) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected product payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);

    return 0;
}

int xdbs_get_product_detail(int id, XDBS_ProductDetail* product) {
    return xdbs_get_product_by_id(id, product);
}

int xdbs_create_product(
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count,
    const int* preuut_step_ids,
    int preuut_step_count,
    const int* sequence_ids,
    int sequence_count,
    const int* postuut_step_ids,
    int postuut_step_count,
    int* product_id
) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* root = NULL;
    json_object* value = NULL;
    int request_status = 0;

    payload = build_product_payload(
        name,
        description,
        params,
        param_count,
        preuut_step_ids,
        preuut_step_count,
        sequence_ids,
        sequence_count,
        postuut_step_ids,
        postuut_step_count
    );
    if (!payload) {
        set_error("Unable to allocate product payload");
        return -1;
    }

    request_status = xdbs_request(
        "POST",
        "/products",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );
    json_object_put(payload);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    if (product_id) {
        root = json_tokener_parse(response.data ? response.data : "");
        if (root && json_object_object_get_ex(root, "id", &value)) {
            *product_id = json_object_get_int(value);
        }
        if (root) {
            json_object_put(root);
        }
    }

    cleanup_http_response(&response);
    return 0;
}

int xdbs_update_product(
    int id,
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count,
    const int* preuut_step_ids,
    int preuut_step_count,
    const int* sequence_ids,
    int sequence_count,
    const int* postuut_step_ids,
    int postuut_step_count
) {
    HttpResponse response;
    json_object* payload = NULL;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/products/%d", id);

    payload = build_product_payload(
        name,
        description,
        params,
        param_count,
        preuut_step_ids,
        preuut_step_count,
        sequence_ids,
        sequence_count,
        postuut_step_ids,
        postuut_step_count
    );
    if (!payload) {
        set_error("Unable to allocate product payload");
        return -1;
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_delete_product(int id) {
    HttpResponse response;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/products/%d", id);
    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_product_params(int product_id, XDBS_Param** params, int* count) {
    XDBS_Product product;
    int status = 0;

    if (!params || !count) {
        set_error("Parameter outputs are required");
        return -1;
    }

    *params = NULL;
    *count = 0;
    memset(&product, 0, sizeof(product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    *count = product.param_count;
    status = duplicate_params(product.params, product.param_count, params);
    xdbs_free_product(&product);

    return status;
}

int xdbs_update_product_param(int product_id, int param_id, const char* value) {
    XDBS_Product product;
    int param_index = -1;
    int status = 0;

    memset(&product, 0, sizeof(product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    param_index = find_param_index_by_id(product.params, product.param_count, param_id);
    if (param_index < 0) {
        xdbs_free_product(&product);
        set_error("Product parameter %d not found", param_id);
        return -1;
    }

    safe_copy(product.params[param_index].value, sizeof(product.params[param_index].value), value ? value : "");

    status = xdbs_update_product(
        product_id,
        product.name,
        product.description,
        product.params,
        product.param_count,
        product.preuut_step_ids,
        product.preuut_step_count,
        product.sequence_ids,
        product.sequence_count,
        product.postuut_step_ids,
        product.postuut_step_count
    );

    xdbs_free_product(&product);
    return status;
}

int xdbs_add_product_param(
    int product_id,
    const char* name,
    const char* type,
    const char* value,
    int* param_id
) {
    XDBS_Product product;
    XDBS_Product refreshed_product;
    XDBS_Param* merged_params = NULL;
    int index = 0;
    int status = 0;

    if (!name) {
        set_error("Product parameter name is required");
        return -1;
    }

    memset(&product, 0, sizeof(product));
    memset(&refreshed_product, 0, sizeof(refreshed_product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    merged_params = (XDBS_Param*)calloc((size_t)product.param_count + 1U, sizeof(XDBS_Param));
    if (!merged_params) {
        xdbs_free_product(&product);
        set_error("Out of memory while adding product parameter");
        return -1;
    }

    for (index = 0; index < product.param_count; ++index) {
        merged_params[index] = product.params[index];
    }

    safe_copy(merged_params[product.param_count].name, sizeof(merged_params[product.param_count].name), name);
    safe_copy(merged_params[product.param_count].type, sizeof(merged_params[product.param_count].type), type ? type : "");
    safe_copy(merged_params[product.param_count].value, sizeof(merged_params[product.param_count].value), value ? value : "");

    status = xdbs_update_product(
        product_id,
        product.name,
        product.description,
        merged_params,
        product.param_count + 1,
        product.preuut_step_ids,
        product.preuut_step_count,
        product.sequence_ids,
        product.sequence_count,
        product.postuut_step_ids,
        product.postuut_step_count
    );

    free(merged_params);

    if (status == 0 && param_id) {
        if (xdbs_get_product_by_id(product_id, &refreshed_product) == 0) {
            for (index = 0; index < refreshed_product.param_count; ++index) {
                if (strcmp(refreshed_product.params[index].name, name) == 0 &&
                    strcmp(refreshed_product.params[index].type, type ? type : "") == 0 &&
                    strcmp(refreshed_product.params[index].value, value ? value : "") == 0) {
                    *param_id = refreshed_product.params[index].id;
                }
            }
            xdbs_free_product(&refreshed_product);
        }
    }

    xdbs_free_product(&product);
    return status;
}

int xdbs_delete_product_param(int product_id, int param_id) {
    XDBS_Product product;
    XDBS_Param* filtered_params = NULL;
    int param_index = -1;
    int source_index = 0;
    int target_index = 0;
    int status = 0;

    memset(&product, 0, sizeof(product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    param_index = find_param_index_by_id(product.params, product.param_count, param_id);
    if (param_index < 0) {
        xdbs_free_product(&product);
        set_error("Product parameter %d not found", param_id);
        return -1;
    }

    if (product.param_count > 1) {
        filtered_params = (XDBS_Param*)calloc((size_t)product.param_count - 1U, sizeof(XDBS_Param));
        if (!filtered_params) {
            xdbs_free_product(&product);
            set_error("Out of memory while deleting product parameter");
            return -1;
        }

        for (source_index = 0; source_index < product.param_count; ++source_index) {
            if (source_index == param_index) {
                continue;
            }
            filtered_params[target_index++] = product.params[source_index];
        }
    }

    status = xdbs_update_product(
        product_id,
        product.name,
        product.description,
        filtered_params,
        product.param_count - 1,
        product.preuut_step_ids,
        product.preuut_step_count,
        product.sequence_ids,
        product.sequence_count,
        product.postuut_step_ids,
        product.postuut_step_count
    );

    free(filtered_params);
    xdbs_free_product(&product);

    return status;
}

int xdbs_get_product_pipeline(
    int product_id,
    XDBS_Pipeline* preuut,
    XDBS_Pipeline* sequences,
    XDBS_Pipeline* postuut
) {
    XDBS_Product product;
    int status = 0;

    if (!preuut || !sequences || !postuut) {
        set_error("Pipeline outputs are required");
        return -1;
    }

    init_pipeline(preuut);
    init_pipeline(sequences);
    init_pipeline(postuut);
    memset(&product, 0, sizeof(product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    if (duplicate_int_array(product.preuut_step_ids, product.preuut_step_count, &preuut->ids) != 0 ||
        duplicate_int_array(product.sequence_ids, product.sequence_count, &sequences->ids) != 0 ||
        duplicate_int_array(product.postuut_step_ids, product.postuut_step_count, &postuut->ids) != 0) {
        xdbs_free_pipeline(preuut);
        xdbs_free_pipeline(sequences);
        xdbs_free_pipeline(postuut);
        xdbs_free_product(&product);
        return -1;
    }

    preuut->count = product.preuut_step_count;
    sequences->count = product.sequence_count;
    postuut->count = product.postuut_step_count;

    xdbs_free_product(&product);
    return 0;
}

int xdbs_update_product_pipeline(
    int product_id,
    const XDBS_Pipeline* preuut,
    const XDBS_Pipeline* sequences,
    const XDBS_Pipeline* postuut
) {
    XDBS_Product product;
    int status = 0;

    memset(&product, 0, sizeof(product));

    status = xdbs_get_product_by_id(product_id, &product);
    if (status != 0) {
        return status;
    }

    status = xdbs_update_product(
        product_id,
        product.name,
        product.description,
        product.params,
        product.param_count,
        preuut ? preuut->ids : product.preuut_step_ids,
        preuut ? preuut->count : product.preuut_step_count,
        sequences ? sequences->ids : product.sequence_ids,
        sequences ? sequences->count : product.sequence_count,
        postuut ? postuut->ids : product.postuut_step_ids,
        postuut ? postuut->count : product.postuut_step_count
    );

    xdbs_free_product(&product);
    return status;
}

int xdbs_get_steps(XDBS_Step** steps, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Step* items = NULL;

    if (!steps || !count) {
        set_error("Steps output pointers are required");
        return -1;
    }

    *steps = NULL;
    *count = 0;

    if (xdbs_request("GET", "/steps", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected steps payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_Step*)calloc(length, sizeof(XDBS_Step));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating steps");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_step_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            xdbs_free_steps(items, (int)length);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *steps = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_step_by_id(int id, XDBS_Step* step) {
    HttpResponse response;
    json_object* root = NULL;
    char endpoint[64];

    if (!step) {
        set_error("Step output pointer is required");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "/steps/%d", id);

    if (xdbs_request("GET", endpoint, NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_step_object(root, step) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected step payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_step_detail(int id, XDBS_StepDetail* step) {
    return xdbs_get_step_by_id(id, step);
}

int xdbs_create_step(
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count,
    int* step_id
) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* root = NULL;
    json_object* value = NULL;
    int request_status = 0;

    payload = build_step_payload(name, description, params, param_count);
    if (!payload) {
        set_error("Unable to allocate step payload");
        return -1;
    }

    request_status = xdbs_request(
        "POST",
        "/steps",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );
    json_object_put(payload);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    if (step_id) {
        root = json_tokener_parse(response.data ? response.data : "");
        if (root && json_object_object_get_ex(root, "id", &value)) {
            *step_id = json_object_get_int(value);
        }
        if (root) {
            json_object_put(root);
        }
    }

    cleanup_http_response(&response);
    return 0;
}

int xdbs_update_step(
    int id,
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count
) {
    HttpResponse response;
    json_object* payload = NULL;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/steps/%d", id);

    payload = build_step_payload(name, description, params, param_count);
    if (!payload) {
        set_error("Unable to allocate step payload");
        return -1;
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_delete_step(int id) {
    HttpResponse response;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/steps/%d", id);
    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_step_params(int step_id, XDBS_Param** params, int* count) {
    XDBS_Step step;
    int status = 0;

    if (!params || !count) {
        set_error("Parameter outputs are required");
        return -1;
    }

    *params = NULL;
    *count = 0;
    memset(&step, 0, sizeof(step));

    status = xdbs_get_step_by_id(step_id, &step);
    if (status != 0) {
        return status;
    }

    *count = step.param_count;
    status = duplicate_params(step.params, step.param_count, params);
    xdbs_free_step(&step);

    return status;
}

int xdbs_update_step_param(int step_id, int param_id, const char* value) {
    XDBS_Step step;
    int param_index = -1;
    int status = 0;

    memset(&step, 0, sizeof(step));

    status = xdbs_get_step_by_id(step_id, &step);
    if (status != 0) {
        return status;
    }

    param_index = find_param_index_by_id(step.params, step.param_count, param_id);
    if (param_index < 0) {
        xdbs_free_step(&step);
        set_error("Step parameter %d not found", param_id);
        return -1;
    }

    safe_copy(step.params[param_index].value, sizeof(step.params[param_index].value), value ? value : "");

    status = xdbs_update_step(
        step_id,
        step.name,
        step.description,
        step.params,
        step.param_count
    );

    xdbs_free_step(&step);
    return status;
}

int xdbs_add_step_param(
    int step_id,
    const char* name,
    const char* type,
    const char* value,
    int* param_id
) {
    XDBS_Step step;
    XDBS_Step refreshed_step;
    XDBS_Param* merged_params = NULL;
    int index = 0;
    int status = 0;

    if (!name) {
        set_error("Step parameter name is required");
        return -1;
    }

    memset(&step, 0, sizeof(step));
    memset(&refreshed_step, 0, sizeof(refreshed_step));

    status = xdbs_get_step_by_id(step_id, &step);
    if (status != 0) {
        return status;
    }

    merged_params = (XDBS_Param*)calloc((size_t)step.param_count + 1U, sizeof(XDBS_Param));
    if (!merged_params) {
        xdbs_free_step(&step);
        set_error("Out of memory while adding step parameter");
        return -1;
    }

    for (index = 0; index < step.param_count; ++index) {
        merged_params[index] = step.params[index];
    }

    safe_copy(merged_params[step.param_count].name, sizeof(merged_params[step.param_count].name), name);
    safe_copy(merged_params[step.param_count].type, sizeof(merged_params[step.param_count].type), type ? type : "");
    safe_copy(merged_params[step.param_count].value, sizeof(merged_params[step.param_count].value), value ? value : "");

    status = xdbs_update_step(
        step_id,
        step.name,
        step.description,
        merged_params,
        step.param_count + 1
    );

    free(merged_params);

    if (status == 0 && param_id) {
        if (xdbs_get_step_by_id(step_id, &refreshed_step) == 0) {
            for (index = 0; index < refreshed_step.param_count; ++index) {
                if (strcmp(refreshed_step.params[index].name, name) == 0 &&
                    strcmp(refreshed_step.params[index].type, type ? type : "") == 0 &&
                    strcmp(refreshed_step.params[index].value, value ? value : "") == 0) {
                    *param_id = refreshed_step.params[index].id;
                }
            }
            xdbs_free_step(&refreshed_step);
        }
    }

    xdbs_free_step(&step);
    return status;
}

int xdbs_delete_step_param(int step_id, int param_id) {
    XDBS_Step step;
    XDBS_Param* filtered_params = NULL;
    int param_index = -1;
    int source_index = 0;
    int target_index = 0;
    int status = 0;

    memset(&step, 0, sizeof(step));

    status = xdbs_get_step_by_id(step_id, &step);
    if (status != 0) {
        return status;
    }

    param_index = find_param_index_by_id(step.params, step.param_count, param_id);
    if (param_index < 0) {
        xdbs_free_step(&step);
        set_error("Step parameter %d not found", param_id);
        return -1;
    }

    if (step.param_count > 1) {
        filtered_params = (XDBS_Param*)calloc((size_t)step.param_count - 1U, sizeof(XDBS_Param));
        if (!filtered_params) {
            xdbs_free_step(&step);
            set_error("Out of memory while deleting step parameter");
            return -1;
        }

        for (source_index = 0; source_index < step.param_count; ++source_index) {
            if (source_index == param_index) {
                continue;
            }
            filtered_params[target_index++] = step.params[source_index];
        }
    }

    status = xdbs_update_step(
        step_id,
        step.name,
        step.description,
        filtered_params,
        step.param_count - 1
    );

    free(filtered_params);
    xdbs_free_step(&step);

    return status;
}

int xdbs_get_sequences(XDBS_Sequence** sequences, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Sequence* items = NULL;

    if (!sequences || !count) {
        set_error("Sequences output pointers are required");
        return -1;
    }

    *sequences = NULL;
    *count = 0;

    if (xdbs_request("GET", "/sequences", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected sequences payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_Sequence*)calloc(length, sizeof(XDBS_Sequence));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating sequences");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_sequence_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            xdbs_free_sequences(items, (int)length);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *sequences = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_sequence_by_id(int id, XDBS_Sequence* sequence) {
    HttpResponse response;
    json_object* root = NULL;
    char endpoint[64];

    if (!sequence) {
        set_error("Sequence output pointer is required");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "/sequences/%d", id);

    if (xdbs_request("GET", endpoint, NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_sequence_object(root, sequence) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected sequence payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_sequence_steps(int sequence_id, int** step_ids, int* count) {
    XDBS_Sequence sequence;
    int status = 0;

    if (!step_ids || !count) {
        set_error("Sequence step outputs are required");
        return -1;
    }

    *step_ids = NULL;
    *count = 0;
    memset(&sequence, 0, sizeof(sequence));

    status = xdbs_get_sequence_by_id(sequence_id, &sequence);
    if (status != 0) {
        return status;
    }

    *count = sequence.step_count;
    status = duplicate_int_array(sequence.step_ids, sequence.step_count, step_ids);
    xdbs_free_sequence(&sequence);

    return status;
}

int xdbs_create_sequence(
    const char* name,
    const char* description,
    const int* step_ids,
    int step_count,
    int* sequence_id
) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* root = NULL;
    json_object* value = NULL;
    int request_status = 0;

    payload = build_sequence_payload(name, description, step_ids, step_count);
    if (!payload) {
        set_error("Unable to allocate sequence payload");
        return -1;
    }

    request_status = xdbs_request(
        "POST",
        "/sequences",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );
    json_object_put(payload);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    if (sequence_id) {
        root = json_tokener_parse(response.data ? response.data : "");
        if (root && json_object_object_get_ex(root, "id", &value)) {
            *sequence_id = json_object_get_int(value);
        }
        if (root) {
            json_object_put(root);
        }
    }

    cleanup_http_response(&response);
    return 0;
}

int xdbs_update_sequence(
    int id,
    const char* name,
    const char* description,
    const int* step_ids,
    int step_count
) {
    HttpResponse response;
    json_object* payload = NULL;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/sequences/%d", id);

    payload = build_sequence_payload(name, description, step_ids, step_count);
    if (!payload) {
        set_error("Unable to allocate sequence payload");
        return -1;
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_update_sequence_step_status(
    int sequence_id,
    int step_id,
    const char* status
) {
    HttpResponse response;
    json_object* payload = NULL;
    char endpoint[96];
    int request_status = 0;

    if (!status) {
        set_error("Sequence status is required");
        return -1;
    }

    snprintf(endpoint, sizeof(endpoint), "/sequences/%d/steps/%d/status", sequence_id, step_id);

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate status payload");
        return -1;
    }

    json_object_object_add(payload, "status", json_object_new_string(status));

    request_status = xdbs_request(
        "POST",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_set_step_status(int sequence_id, int step_id, const char* status) {
    return xdbs_update_sequence_step_status(sequence_id, step_id, status);
}

int xdbs_delete_sequence(int id) {
    HttpResponse response;
    char endpoint[64];
    int request_status = 0;

    snprintf(endpoint, sizeof(endpoint), "/sequences/%d", id);
    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_users(XDBS_UserInfo** users, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_UserInfo* items = NULL;

    if (!users || !count) {
        set_error("User outputs are required");
        return -1;
    }

    *users = NULL;
    *count = 0;

    if (xdbs_request("GET", "/users", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected users payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_UserInfo*)calloc(length, sizeof(XDBS_UserInfo));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating users");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_user_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            free(items);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *users = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_user_by_username(const char* username, XDBS_UserInfo* user) {
    HttpResponse response;
    json_object* root = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!username || !user) {
        set_error("Username and user output are required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/users/", username);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("GET", endpoint, NULL, &response);
    free(endpoint);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_user_object(root, user) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected user payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_create_user(
    const char* username,
    const char* password,
    const char* role,
    const char* email,
    const char* phone,
    const char* address,
    int can_login
) {
    HttpResponse response;
    json_object* payload = NULL;
    int request_status = 0;

    if (!username || !password) {
        set_error("Username and password are required");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate user payload");
        return -1;
    }

    json_object_object_add(payload, "username", json_object_new_string(username));
    json_object_object_add(payload, "password", json_object_new_string(password));
    add_optional_string(payload, "role", role);
    add_optional_string(payload, "email", email);
    add_optional_string(payload, "phone", phone);
    add_optional_string(payload, "address", address);

    request_status = xdbs_request(
        "POST",
        "/users",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    if (request_status != 0) {
        return request_status;
    }

    if (!can_login) {
        return xdbs_update_user(username, NULL, NULL, NULL, "DISABLED");
    }

    return 0;
}

int xdbs_update_user(
    const char* username,
    const char* email,
    const char* phone,
    const char* address,
    const char* status
) {
    HttpResponse response;
    json_object* payload = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!username) {
        set_error("Username is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/users/", username);
    if (!endpoint) {
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        free(endpoint);
        set_error("Unable to allocate user update payload");
        return -1;
    }

    add_optional_string(payload, "email", email);
    add_optional_string(payload, "phone", phone);
    add_optional_string(payload, "address", address);
    add_optional_string(payload, "status", status);

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_delete_user(const char* username) {
    HttpResponse response;
    char* endpoint = NULL;
    int request_status = 0;

    if (!username) {
        set_error("Username is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/users/", username);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_change_password(
    const char* username,
    const char* current_password,
    const char* new_password
) {
    HttpResponse response;
    json_object* payload = NULL;
    int request_status = 0;

    (void)username;

    if (!current_password || !new_password) {
        set_error("Current and new passwords are required");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate password payload");
        return -1;
    }

    json_object_object_add(payload, "currentPassword", json_object_new_string(current_password));
    json_object_object_add(payload, "newPassword", json_object_new_string(new_password));

    request_status = xdbs_request(
        "POST",
        "/users/change-password",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_reset_user_password(const char* username, const char* new_password) {
    HttpResponse response;
    json_object* payload = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!username || !new_password) {
        set_error("Username and new password are required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/users/reset-password/", username);
    if (!endpoint) {
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        free(endpoint);
        set_error("Unable to allocate reset password payload");
        return -1;
    }

    json_object_object_add(payload, "newPassword", json_object_new_string(new_password));

    request_status = xdbs_request(
        "POST",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_roles(XDBS_Role** roles, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Role* items = NULL;

    if (!roles || !count) {
        set_error("Role outputs are required");
        return -1;
    }

    *roles = NULL;
    *count = 0;

    if (xdbs_request("GET", "/roles", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected roles payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_Role*)calloc(length, sizeof(XDBS_Role));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating roles");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_role_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            free(items);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *roles = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_role_by_id(const char* role_id, XDBS_Role* role) {
    HttpResponse response;
    json_object* root = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!role_id || !role) {
        set_error("Role id and role output are required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/roles/", role_id);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("GET", endpoint, NULL, &response);
    free(endpoint);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_role_object(root, role) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected role payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_create_role(
    const char* role_id,
    const char* description,
    const char* const* rights,
    int right_count
) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* rights_array = NULL;
    int request_status = 0;

    if (!role_id || !description) {
        set_error("Role id and description are required");
        return -1;
    }

    rights_array = build_string_json_array(rights, right_count);
    if (!rights_array) {
        set_error("Unable to allocate role rights payload");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        json_object_put(rights_array);
        set_error("Unable to allocate role payload");
        return -1;
    }

    json_object_object_add(payload, "id_role", json_object_new_string(role_id));
    json_object_object_add(payload, "description", json_object_new_string(description));
    json_object_object_add(payload, "rights", rights_array);

    request_status = xdbs_request(
        "POST",
        "/roles",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_update_role(
    const char* role_id,
    const char* description,
    const char* const* rights,
    int right_count
) {
    HttpResponse response;
    json_object* payload = NULL;
    json_object* rights_array = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!role_id) {
        set_error("Role id is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/roles/", role_id);
    if (!endpoint) {
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        free(endpoint);
        set_error("Unable to allocate role update payload");
        return -1;
    }

    add_optional_string(payload, "description", description);
    if (rights || right_count == 0) {
        rights_array = build_string_json_array(rights, right_count);
        if (!rights_array) {
            json_object_put(payload);
            free(endpoint);
            set_error("Unable to allocate role rights payload");
            return -1;
        }
        json_object_object_add(payload, "rights", rights_array);
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_delete_role(const char* role_id) {
    HttpResponse response;
    char* endpoint = NULL;
    int request_status = 0;

    if (!role_id) {
        set_error("Role id is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/roles/", role_id);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_rights(XDBS_Right** rights, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_Right* items = NULL;

    if (!rights || !count) {
        set_error("Right outputs are required");
        return -1;
    }

    *rights = NULL;
    *count = 0;

    if (xdbs_request("GET", "/rights", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected rights payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_Right*)calloc(length, sizeof(XDBS_Right));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating rights");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_right_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            free(items);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *rights = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_get_right_by_id(const char* right_id, XDBS_Right* right) {
    HttpResponse response;
    json_object* root = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!right_id || !right) {
        set_error("Right id and output are required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/rights/", right_id);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("GET", endpoint, NULL, &response);
    free(endpoint);

    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || parse_right_object(root, right) != 0) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected right payload");
        return -1;
    }

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_create_right(
    const char* right_id,
    const char* description,
    const char* module
) {
    HttpResponse response;
    json_object* payload = NULL;
    int request_status = 0;

    if (!right_id) {
        set_error("Right id is required");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate right payload");
        return -1;
    }

    json_object_object_add(payload, "id_right", json_object_new_string(right_id));
    add_optional_string(payload, "description", description);
    add_string_or_null(payload, "module", module, 1);

    request_status = xdbs_request(
        "POST",
        "/rights",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_update_right(
    const char* right_id,
    const char* description,
    const char* module
) {
    HttpResponse response;
    json_object* payload = NULL;
    char* endpoint = NULL;
    int request_status = 0;

    if (!right_id) {
        set_error("Right id is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/rights/", right_id);
    if (!endpoint) {
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        free(endpoint);
        set_error("Unable to allocate right update payload");
        return -1;
    }

    add_optional_string(payload, "description", description);
    if (module != NULL) {
        add_string_or_null(payload, "module", module, 1);
    }

    request_status = xdbs_request(
        "PUT",
        endpoint,
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_delete_right(const char* right_id) {
    HttpResponse response;
    char* endpoint = NULL;
    int request_status = 0;

    if (!right_id) {
        set_error("Right id is required");
        return -1;
    }

    endpoint = make_endpoint_with_escaped_segment("/rights/", right_id);
    if (!endpoint) {
        return -1;
    }

    request_status = xdbs_request("DELETE", endpoint, NULL, &response);
    free(endpoint);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_history(XDBS_HistoryEntry** entries, int* count) {
    HttpResponse response;
    json_object* root = NULL;
    size_t index = 0U;
    size_t length = 0U;
    XDBS_HistoryEntry* items = NULL;

    if (!entries || !count) {
        set_error("History outputs are required");
        return -1;
    }

    *entries = NULL;
    *count = 0;

    if (xdbs_request("GET", "/history", NULL, &response) != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_is_type(root, json_type_array)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Unexpected history payload");
        return -1;
    }

    length = json_object_array_length(root);
    items = (XDBS_HistoryEntry*)calloc(length, sizeof(XDBS_HistoryEntry));
    if (!items && length > 0U) {
        json_object_put(root);
        cleanup_http_response(&response);
        set_error("Out of memory while allocating history entries");
        return -1;
    }

    for (index = 0U; index < length; ++index) {
        if (parse_history_object(json_object_array_get_idx(root, index), &items[index]) != 0) {
            free(items);
            json_object_put(root);
            cleanup_http_response(&response);
            return -1;
        }
    }

    *entries = items;
    *count = (int)length;

    json_object_put(root);
    cleanup_http_response(&response);
    return 0;
}

int xdbs_create_history_entry(
    const char* user_name,
    const char* action,
    const char* entity,
    int entity_id,
    const char* details
) {
    HttpResponse response;
    json_object* payload = NULL;
    const char* resolved_username = NULL;
    const char* resolved_action = NULL;
    const char* resolved_entity = NULL;
    int request_status = 0;

    resolved_username = resolve_history_username(user_name);
    resolved_action = normalize_history_action(action);
    resolved_entity = normalize_history_entity(entity);

    if (!resolved_username || !details) {
        set_error("History user_name and details are required");
        return -1;
    }

    if (!resolved_action) {
        set_error("Unsupported history action: %s", action ? action : "(null)");
        return -1;
    }

    if (!resolved_entity) {
        set_error("Unsupported history entity: %s", entity ? entity : "(null)");
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate history payload");
        return -1;
    }

    json_object_object_add(payload, "user_name", json_object_new_string(resolved_username));
    json_object_object_add(payload, "action", json_object_new_string(resolved_action));
    json_object_object_add(payload, "entity", json_object_new_string(resolved_entity));
    json_object_object_add(payload, "entity_id", json_object_new_int(entity_id));
    json_object_object_add(payload, "details", json_object_new_string(details));

    request_status = xdbs_request(
        "POST",
        "/history",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    return request_status;
}

int xdbs_get_execution_modes(XDBS_ExecutionMode** modes, int* count) {
    return xdbs_get_crud_list(
        "/execution-mode",
        sizeof(XDBS_ExecutionMode),
        parse_execution_mode_object,
        (void**)modes,
        count
    );
}

int xdbs_get_execution_mode(int id, XDBS_ExecutionMode* mode) {
    return xdbs_get_crud_item("/execution-mode", id, parse_execution_mode_object, mode);
}

int xdbs_create_execution_mode(const char* name, const char* description, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!name) {
        set_error("Execution mode name is required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "name", json_object_new_string(name));
    add_optional_string(payload, "description", description);
    status = xdbs_send_crud_payload("POST", "/execution-mode", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_execution_mode(int id, const char* name, const char* description) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_string(payload, "name", name);
    add_optional_string(payload, "description", description);
    snprintf(endpoint, sizeof(endpoint), "/execution-mode/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_execution_mode(int id) {
    return xdbs_delete_crud_item("/execution-mode", id);
}

int xdbs_get_step_definitions(XDBS_StepDefinition** steps, int* count) {
    return xdbs_get_crud_list(
        "/step",
        sizeof(XDBS_StepDefinition),
        parse_step_definition_object,
        (void**)steps,
        count
    );
}

int xdbs_get_step_definition(int id, XDBS_StepDefinition* step) {
    return xdbs_get_crud_item("/step", id, parse_step_definition_object, step);
}

int xdbs_create_step_definition(const char* name, const char* description, int depends_on, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!name) {
        set_error("Step name is required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "name", json_object_new_string(name));
    add_optional_string(payload, "description", description);
    add_optional_int(payload, "depends_on", depends_on);
    status = xdbs_send_crud_payload("POST", "/step", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_step_definition(int id, const char* name, const char* description, int depends_on) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_string(payload, "name", name);
    add_optional_string(payload, "description", description);
    add_nullable_int(payload, "depends_on", depends_on);
    snprintf(endpoint, sizeof(endpoint), "/step/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_step_definition(int id) {
    return xdbs_delete_crud_item("/step", id);
}

int xdbs_get_step_param_definitions(XDBS_StepParamDefinition** params, int* count) {
    return xdbs_get_crud_list(
        "/step-param",
        sizeof(XDBS_StepParamDefinition),
        parse_step_param_definition_object,
        (void**)params,
        count
    );
}

int xdbs_get_step_param_definition(int id, XDBS_StepParamDefinition* param) {
    return xdbs_get_crud_item("/step-param", id, parse_step_param_definition_object, param);
}

int xdbs_create_step_param_definition(int step_id, const char* name, const char* type, const char* default_value, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!name || !type) {
        set_error("Step param name and type are required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "step_id", json_object_new_int(step_id));
    json_object_object_add(payload, "param_name", json_object_new_string(name));
    json_object_object_add(payload, "param_type", json_object_new_string(type));
    add_optional_string(payload, "default_value", default_value);
    status = xdbs_send_crud_payload("POST", "/step-param", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_step_param_definition(int id, int step_id, const char* name, const char* type, const char* default_value) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "step_id", step_id);
    add_optional_string(payload, "param_name", name);
    add_optional_string(payload, "param_type", type);
    add_optional_string(payload, "default_value", default_value);
    snprintf(endpoint, sizeof(endpoint), "/step-param/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_step_param_definition(int id) {
    return xdbs_delete_crud_item("/step-param", id);
}

int xdbs_get_step_limit_definitions(XDBS_StepLimitDefinition** limits, int* count) {
    return xdbs_get_crud_list(
        "/step-limit",
        sizeof(XDBS_StepLimitDefinition),
        parse_step_limit_definition_object,
        (void**)limits,
        count
    );
}

int xdbs_get_step_limit_definition(int id, XDBS_StepLimitDefinition* limit) {
    return xdbs_get_crud_item("/step-limit", id, parse_step_limit_definition_object, limit);
}

int xdbs_create_step_limit_definition(int step_id, const char* name, const char* type, const char* comparison_type, const char* value, const char* min, const char* max, const char* unit, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!name || !type || !comparison_type) {
        set_error("Step limit name, type and comparison type are required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "step_id", json_object_new_int(step_id));
    json_object_object_add(payload, "limit_name", json_object_new_string(name));
    json_object_object_add(payload, "limit_type", json_object_new_string(type));
    json_object_object_add(payload, "comparison_type", json_object_new_string(comparison_type));
    add_optional_string(payload, "limit_value", value);
    add_optional_string(payload, "limit_min", min);
    add_optional_string(payload, "limit_max", max);
    add_optional_string(payload, "unit", unit);
    status = xdbs_send_crud_payload("POST", "/step-limit", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_step_limit_definition(int id, int step_id, const char* name, const char* type, const char* comparison_type, const char* value, const char* min, const char* max, const char* unit) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "step_id", step_id);
    add_optional_string(payload, "limit_name", name);
    add_optional_string(payload, "limit_type", type);
    add_optional_string(payload, "comparison_type", comparison_type);
    add_optional_string(payload, "limit_value", value);
    add_optional_string(payload, "limit_min", min);
    add_optional_string(payload, "limit_max", max);
    add_optional_string(payload, "unit", unit);
    snprintf(endpoint, sizeof(endpoint), "/step-limit/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_step_limit_definition(int id) {
    return xdbs_delete_crud_item("/step-limit", id);
}

int xdbs_get_sequence_definitions(XDBS_SequenceDefinition** sequences, int* count) {
    return xdbs_get_crud_list(
        "/sequence",
        sizeof(XDBS_SequenceDefinition),
        parse_sequence_definition_object,
        (void**)sequences,
        count
    );
}

int xdbs_get_sequence_definition(int id, XDBS_SequenceDefinition* sequence) {
    return xdbs_get_crud_item("/sequence", id, parse_sequence_definition_object, sequence);
}

int xdbs_create_sequence_definition(const char* name, const char* description, int depends_on, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!name) {
        set_error("Sequence name is required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "name", json_object_new_string(name));
    add_optional_string(payload, "description", description);
    add_optional_int(payload, "depends_on", depends_on);
    status = xdbs_send_crud_payload("POST", "/sequence", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_sequence_definition(int id, const char* name, const char* description, int depends_on) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_string(payload, "name", name);
    add_optional_string(payload, "description", description);
    add_nullable_int(payload, "depends_on", depends_on);
    snprintf(endpoint, sizeof(endpoint), "/sequence/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_sequence_definition(int id) {
    return xdbs_delete_crud_item("/sequence", id);
}

int xdbs_get_sequence_step_links(XDBS_SequenceStepLink** links, int* count) {
    return xdbs_get_crud_list(
        "/sequence-step",
        sizeof(XDBS_SequenceStepLink),
        parse_sequence_step_link_object,
        (void**)links,
        count
    );
}

int xdbs_get_sequence_step_link(int id, XDBS_SequenceStepLink* link) {
    return xdbs_get_crud_item("/sequence-step", id, parse_sequence_step_link_object, link);
}

int xdbs_create_sequence_step_link(int sequence_id, int step_id, int order_index, int* id) {
    json_object* payload = json_object_new_object();
    int status = 0;

    json_object_object_add(payload, "sequence_id", json_object_new_int(sequence_id));
    json_object_object_add(payload, "step_id", json_object_new_int(step_id));
    json_object_object_add(payload, "order_index", json_object_new_int(order_index));
    status = xdbs_send_crud_payload("POST", "/sequence-step", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_sequence_step_link(int id, int sequence_id, int step_id, int order_index) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "sequence_id", sequence_id);
    add_optional_int(payload, "step_id", step_id);
    add_optional_int(payload, "order_index", order_index);
    snprintf(endpoint, sizeof(endpoint), "/sequence-step/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_sequence_step_link(int id) {
    return xdbs_delete_crud_item("/sequence-step", id);
}

int xdbs_get_product_sequence_links(XDBS_ProductSequenceLink** links, int* count) {
    return xdbs_get_crud_list(
        "/product-sequence",
        sizeof(XDBS_ProductSequenceLink),
        parse_product_sequence_link_object,
        (void**)links,
        count
    );
}

int xdbs_get_product_sequence_link(int id, XDBS_ProductSequenceLink* link) {
    return xdbs_get_crud_item("/product-sequence", id, parse_product_sequence_link_object, link);
}

int xdbs_create_product_sequence_link(int product_id, int sequence_id, int order_index, int* id) {
    json_object* payload = json_object_new_object();
    int status = 0;

    json_object_object_add(payload, "product_id", json_object_new_int(product_id));
    json_object_object_add(payload, "sequence_id", json_object_new_int(sequence_id));
    json_object_object_add(payload, "order_index", json_object_new_int(order_index));
    status = xdbs_send_crud_payload("POST", "/product-sequence", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_product_sequence_link(int id, int product_id, int sequence_id, int order_index) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "product_id", product_id);
    add_optional_int(payload, "sequence_id", sequence_id);
    add_optional_int(payload, "order_index", order_index);
    snprintf(endpoint, sizeof(endpoint), "/product-sequence/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_product_sequence_link(int id) {
    return xdbs_delete_crud_item("/product-sequence", id);
}

int xdbs_get_product_step_param_values(XDBS_ProductStepParamValue** values, int* count) {
    return xdbs_get_crud_list(
        "/product-step-param",
        sizeof(XDBS_ProductStepParamValue),
        parse_product_step_param_value_object,
        (void**)values,
        count
    );
}

int xdbs_get_product_step_param_value(int id, XDBS_ProductStepParamValue* value) {
    return xdbs_get_crud_item("/product-step-param", id, parse_product_step_param_value_object, value);
}

int xdbs_create_product_step_param_value(int product_id, int step_param_id, const char* value, int* id) {
    json_object* payload = NULL;
    int status = 0;

    if (!value) {
        set_error("Product step param value is required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "product_id", json_object_new_int(product_id));
    json_object_object_add(payload, "step_param_id", json_object_new_int(step_param_id));
    json_object_object_add(payload, "value", json_object_new_string(value));
    status = xdbs_send_crud_payload("POST", "/product-step-param", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_product_step_param_value(int id, int product_id, int step_param_id, const char* value) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "product_id", product_id);
    add_optional_int(payload, "step_param_id", step_param_id);
    add_optional_string(payload, "value", value);
    snprintf(endpoint, sizeof(endpoint), "/product-step-param/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_product_step_param_value(int id) {
    return xdbs_delete_crud_item("/product-step-param", id);
}

int xdbs_get_product_execution_configs(XDBS_ProductExecutionConfig** configs, int* count) {
    return xdbs_get_crud_list(
        "/product-execution-config",
        sizeof(XDBS_ProductExecutionConfig),
        parse_product_execution_config_object,
        (void**)configs,
        count
    );
}

int xdbs_get_product_execution_config(int id, XDBS_ProductExecutionConfig* config) {
    return xdbs_get_crud_item("/product-execution-config", id, parse_product_execution_config_object, config);
}

int xdbs_create_product_execution_config(int product_id, int execution_mode_id, int sequence_id, int step_id, int is_active, int ignore_fail, int retry_on_fail, int repeat_count, int retry_delay_ms, int* id) {
    json_object* payload = json_object_new_object();
    int status = 0;

    json_object_object_add(payload, "product_id", json_object_new_int(product_id));
    json_object_object_add(payload, "execution_mode_id", json_object_new_int(execution_mode_id));
    add_optional_int(payload, "sequence_id", sequence_id);
    add_optional_int(payload, "step_id", step_id);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    json_object_object_add(payload, "ignore_fail", json_object_new_boolean(ignore_fail != 0));
    json_object_object_add(payload, "retry_on_fail", json_object_new_int(retry_on_fail));
    json_object_object_add(payload, "repeat_count", json_object_new_int(repeat_count));
    json_object_object_add(payload, "retry_delay_ms", json_object_new_int(retry_delay_ms));
    status = xdbs_send_crud_payload("POST", "/product-execution-config", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_product_execution_config(int id, int product_id, int execution_mode_id, int sequence_id, int step_id, int is_active, int ignore_fail, int retry_on_fail, int repeat_count, int retry_delay_ms) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "product_id", product_id);
    add_optional_int(payload, "execution_mode_id", execution_mode_id);
    add_nullable_int(payload, "sequence_id", sequence_id);
    add_nullable_int(payload, "step_id", step_id);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    json_object_object_add(payload, "ignore_fail", json_object_new_boolean(ignore_fail != 0));
    add_optional_int(payload, "retry_on_fail", retry_on_fail);
    add_optional_int(payload, "repeat_count", repeat_count);
    add_optional_int(payload, "retry_delay_ms", retry_delay_ms);
    snprintf(endpoint, sizeof(endpoint), "/product-execution-config/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_product_execution_config(int id) {
    return xdbs_delete_crud_item("/product-execution-config", id);
}

int xdbs_get_component_instances(XDBS_ComponentInstance** instances, int* count) {
    return xdbs_get_crud_list(
        "/component-instance",
        sizeof(XDBS_ComponentInstance),
        parse_component_instance_object,
        (void**)instances,
        count
    );
}

int xdbs_get_component_instance(int id, XDBS_ComponentInstance* instance) {
    return xdbs_get_crud_item("/component-instance", id, parse_component_instance_object, instance);
}

int xdbs_create_component_instance(
    int product_id,
    int step_id,
    int instance_index,
    const char* instance_name,
    const char* description,
    const char* physical_ref,
    int is_active,
    int* id
) {
    json_object* payload = NULL;
    int status = 0;

    if (!instance_name) {
        set_error("Component instance name is required");
        return -1;
    }

    payload = json_object_new_object();
    json_object_object_add(payload, "product_id", json_object_new_int(product_id));
    json_object_object_add(payload, "step_id", json_object_new_int(step_id));
    json_object_object_add(payload, "instance_index", json_object_new_int(instance_index));
    json_object_object_add(payload, "instance_name", json_object_new_string(instance_name));
    add_optional_string(payload, "description", description);
    add_optional_string(payload, "physical_ref", physical_ref);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    status = xdbs_send_crud_payload("POST", "/component-instance", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_component_instance(
    int id,
    int product_id,
    int step_id,
    int instance_index,
    const char* instance_name,
    const char* description,
    const char* physical_ref,
    int is_active
) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "product_id", product_id);
    add_optional_int(payload, "step_id", step_id);
    add_optional_int(payload, "instance_index", instance_index);
    add_optional_string(payload, "instance_name", instance_name);
    add_optional_string(payload, "description", description);
    add_optional_string(payload, "physical_ref", physical_ref);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    snprintf(endpoint, sizeof(endpoint), "/component-instance/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_component_instance(int id) {
    return xdbs_delete_crud_item("/component-instance", id);
}

int xdbs_get_product_step_limit_values(XDBS_ProductStepLimitValue** values, int* count) {
    return xdbs_get_crud_list(
        "/product-step-limit",
        sizeof(XDBS_ProductStepLimitValue),
        parse_product_step_limit_value_object,
        (void**)values,
        count
    );
}

int xdbs_get_product_step_limit_value(int id, XDBS_ProductStepLimitValue* value) {
    return xdbs_get_crud_item("/product-step-limit", id, parse_product_step_limit_value_object, value);
}

int xdbs_create_product_step_limit_value(
    int component_instance_id,
    int step_limit_id,
    const char* limit_value,
    const char* limit_min,
    const char* limit_max,
    int is_active,
    int execution_mode_id,
    int* id
) {
    json_object* payload = json_object_new_object();
    int status = 0;

    json_object_object_add(payload, "component_instance_id", json_object_new_int(component_instance_id));
    json_object_object_add(payload, "step_limit_id", json_object_new_int(step_limit_id));
    add_optional_string(payload, "limit_value", limit_value);
    add_optional_string(payload, "limit_min", limit_min);
    add_optional_string(payload, "limit_max", limit_max);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    add_nullable_int(payload, "execution_mode_id", execution_mode_id);
    status = xdbs_send_crud_payload("POST", "/product-step-limit", payload, id);
    json_object_put(payload);
    return status;
}

int xdbs_update_product_step_limit_value(
    int id,
    int component_instance_id,
    int step_limit_id,
    const char* limit_value,
    const char* limit_min,
    const char* limit_max,
    int is_active,
    int execution_mode_id
) {
    json_object* payload = json_object_new_object();
    char endpoint[128];
    int status = 0;

    add_optional_int(payload, "component_instance_id", component_instance_id);
    add_optional_int(payload, "step_limit_id", step_limit_id);
    add_string_or_null(payload, "limit_value", limit_value, 1);
    add_string_or_null(payload, "limit_min", limit_min, 1);
    add_string_or_null(payload, "limit_max", limit_max, 1);
    json_object_object_add(payload, "is_active", json_object_new_boolean(is_active != 0));
    add_nullable_int(payload, "execution_mode_id", execution_mode_id);
    snprintf(endpoint, sizeof(endpoint), "/product-step-limit/%d", id);
    status = xdbs_send_crud_payload("PUT", endpoint, payload, NULL);
    json_object_put(payload);
    return status;
}

int xdbs_delete_product_step_limit_value(int id) {
    return xdbs_delete_crud_item("/product-step-limit", id);
}

int xdbs_upload_avatar(const char* username, const char* file_path) {
    HttpResponse response;
    json_object* root = NULL;
    json_object* avatar_url_obj = NULL;
    char avatar_url[XDBS_MAX_STRING];
    int request_status = 0;

    if (!username || !file_path) {
        set_error("Username and file path are required");
        return -1;
    }

    avatar_url[0] = '\0';

    request_status = xdbs_upload_file_request("/uploads/avatar", "file", file_path, &response);
    if (request_status != 0) {
        cleanup_http_response(&response);
        return -1;
    }

    root = json_tokener_parse(response.data ? response.data : "");
    if (!root || !json_object_object_get_ex(root, "avatarUrl", &avatar_url_obj)) {
        if (root) {
            json_object_put(root);
        }
        cleanup_http_response(&response);
        set_error("Upload succeeded but no avatarUrl was returned");
        return -1;
    }

    safe_copy(avatar_url, sizeof(avatar_url), json_object_get_string(avatar_url_obj));
    json_object_put(root);
    cleanup_http_response(&response);

    return xdbs_update_user_avatar_internal(username, avatar_url, 0);
}

int xdbs_delete_avatar(const char* username) {
    HttpResponse response;
    XDBS_UserInfo user;
    json_object* payload = NULL;
    int request_status = 0;

    if (!username) {
        set_error("Username is required");
        return -1;
    }

    memset(&user, 0, sizeof(user));

    request_status = xdbs_get_user_by_username(username, &user);
    if (request_status != 0) {
        return request_status;
    }

    if (user.avatar[0] == '\0') {
        set_error("User %s has no avatar to delete", username);
        return -1;
    }

    payload = json_object_new_object();
    if (!payload) {
        set_error("Unable to allocate avatar delete payload");
        return -1;
    }

    json_object_object_add(payload, "avatarUrl", json_object_new_string(user.avatar));

    request_status = xdbs_request(
        "DELETE",
        "/uploads/avatar",
        json_object_to_json_string_ext(payload, JSON_C_TO_STRING_PLAIN),
        &response
    );

    json_object_put(payload);
    cleanup_http_response(&response);

    if (request_status != 0) {
        return request_status;
    }

    return xdbs_update_user_avatar_internal(username, NULL, 1);
}

void xdbs_free_params(XDBS_Param* params) {
    free(params);
}

void xdbs_free_pipeline(XDBS_Pipeline* pipeline) {
    if (!pipeline) {
        return;
    }

    free(pipeline->ids);
    pipeline->ids = NULL;
    pipeline->count = 0;
}

void xdbs_free_product(XDBS_Product* product) {
    if (!product) {
        return;
    }

    free(product->params);
    free(product->preuut_step_ids);
    free(product->sequence_ids);
    free(product->postuut_step_ids);

    product->params = NULL;
    product->preuut_step_ids = NULL;
    product->sequence_ids = NULL;
    product->postuut_step_ids = NULL;
    product->param_count = 0;
    product->preuut_step_count = 0;
    product->sequence_count = 0;
    product->postuut_step_count = 0;
}

void xdbs_free_products(XDBS_Product* products, int count) {
    int index = 0;

    if (!products) {
        return;
    }

    for (index = 0; index < count; ++index) {
        xdbs_free_product(&products[index]);
    }

    free(products);
}

void xdbs_free_step(XDBS_Step* step) {
    if (!step) {
        return;
    }

    free(step->params);
    step->params = NULL;
    step->param_count = 0;
}

void xdbs_free_steps(XDBS_Step* steps, int count) {
    int index = 0;

    if (!steps) {
        return;
    }

    for (index = 0; index < count; ++index) {
        xdbs_free_step(&steps[index]);
    }

    free(steps);
}

void xdbs_free_sequence(XDBS_Sequence* sequence) {
    if (!sequence) {
        return;
    }

    free(sequence->step_ids);
    free(sequence->step_statuses);
    sequence->step_ids = NULL;
    sequence->step_statuses = NULL;
    sequence->step_count = 0;
    sequence->step_status_count = 0;
}

void xdbs_free_sequences(XDBS_Sequence* sequences, int count) {
    int index = 0;

    if (!sequences) {
        return;
    }

    for (index = 0; index < count; ++index) {
        xdbs_free_sequence(&sequences[index]);
    }

    free(sequences);
}

void xdbs_free_users(XDBS_UserInfo* users) {
    free(users);
}

void xdbs_free_roles(XDBS_Role* roles) {
    free(roles);
}

void xdbs_free_rights(XDBS_Right* rights) {
    free(rights);
}

void xdbs_free_history_entries(XDBS_HistoryEntry* entries) {
    free(entries);
}

void xdbs_free_execution_modes(XDBS_ExecutionMode* modes, int count) {
    (void)count;
    free(modes);
}

void xdbs_free_step_definitions(XDBS_StepDefinition* steps, int count) {
    (void)count;
    free(steps);
}

void xdbs_free_step_param_definitions(XDBS_StepParamDefinition* params, int count) {
    (void)count;
    free(params);
}

void xdbs_free_step_limit_definitions(XDBS_StepLimitDefinition* limits, int count) {
    (void)count;
    free(limits);
}

void xdbs_free_sequence_definitions(XDBS_SequenceDefinition* sequences, int count) {
    (void)count;
    free(sequences);
}

void xdbs_free_sequence_step_links(XDBS_SequenceStepLink* links, int count) {
    (void)count;
    free(links);
}

void xdbs_free_product_sequence_links(XDBS_ProductSequenceLink* links, int count) {
    (void)count;
    free(links);
}

void xdbs_free_product_step_param_values(XDBS_ProductStepParamValue* values, int count) {
    (void)count;
    free(values);
}

void xdbs_free_product_execution_configs(XDBS_ProductExecutionConfig* configs, int count) {
    (void)count;
    free(configs);
}

void xdbs_free_component_instances(XDBS_ComponentInstance* instances, int count) {
    (void)count;
    free(instances);
}

void xdbs_free_product_step_limit_values(XDBS_ProductStepLimitValue* values, int count) {
    (void)count;
    free(values);
}
