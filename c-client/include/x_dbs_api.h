#ifndef X_DBS_API_H
#define X_DBS_API_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define XDBS_MAX_STRING 256
#define XDBS_MAX_SMALL_STRING 32
#define XDBS_MAX_LARGE_STRING 1024

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char type[XDBS_MAX_SMALL_STRING];
    char value[XDBS_MAX_STRING];
} XDBS_Param;

typedef struct {
    int step_id;
    char status[XDBS_MAX_SMALL_STRING];
} XDBS_SequenceStepStatus;

typedef struct {
    int* ids;
    int count;
} XDBS_Pipeline;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_STRING];
    XDBS_Param* params;
    int param_count;
    int* preuut_step_ids;
    int preuut_step_count;
    int* sequence_ids;
    int sequence_count;
    int* postuut_step_ids;
    int postuut_step_count;
    char created_by[XDBS_MAX_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
} XDBS_Product;

typedef XDBS_Product XDBS_ProductDetail;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_STRING];
    XDBS_Param* params;
    int param_count;
    char created_by[XDBS_MAX_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
} XDBS_Step;

typedef XDBS_Step XDBS_StepDetail;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_STRING];
    int* step_ids;
    int step_count;
    XDBS_SequenceStepStatus* step_statuses;
    int step_status_count;
    char created_by[XDBS_MAX_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
} XDBS_Sequence;

typedef struct {
    char username[XDBS_MAX_STRING];
    char role[XDBS_MAX_STRING];
    char rights[XDBS_MAX_LARGE_STRING];
    char status[XDBS_MAX_SMALL_STRING];
    char email[XDBS_MAX_STRING];
    char phone[XDBS_MAX_STRING];
    char address[XDBS_MAX_LARGE_STRING];
    char avatar[XDBS_MAX_STRING];
    char last_login[XDBS_MAX_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
} XDBS_UserInfo;

typedef struct {
    char id_role[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    char rights[XDBS_MAX_LARGE_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
    char updated_at[XDBS_MAX_SMALL_STRING];
} XDBS_Role;

typedef struct {
    char id_right[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    char module[XDBS_MAX_STRING];
    char created_at[XDBS_MAX_SMALL_STRING];
} XDBS_Right;

typedef struct {
    int id;
    char user_name[XDBS_MAX_STRING];
    char avatar[XDBS_MAX_STRING];
    char action[XDBS_MAX_SMALL_STRING];
    char entity[XDBS_MAX_SMALL_STRING];
    int entity_id;
    char details[XDBS_MAX_LARGE_STRING];
    char created_at[XDBS_MAX_STRING];
} XDBS_HistoryEntry;

typedef struct {
    int product_id;
    int count;
    char updated_at[50];
} XDBS_ProductCounter;

typedef struct {
    int status_id;
    int product_id;
    char barcode[50];
    double duration;
    int failed;
    int mode_id;
    char created_at[50];
} XDBS_ProductStatus;

typedef struct {
    int id;
    int item_id;
    int terminated;
    char started_at[50];
    char ended_at[50];
} XDBS_Status;

typedef struct {
    int status_id;
    int product_id;
    int test_id;
    int parameter_id;
    int vtype;
    double dvalue;
    int ivalue;
    char svalue[100];
    char created_at[50];
} XDBS_StepStatus;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    char created_at[50];
} XDBS_ExecutionMode;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    int depends_on;
    int has_depends_on;
    char created_at[50];
} XDBS_StepDefinition;

typedef struct {
    int id;
    int step_id;
    char param_name[XDBS_MAX_STRING];
    char param_type[XDBS_MAX_SMALL_STRING];
    char default_value[XDBS_MAX_STRING];
    char created_at[50];
} XDBS_StepParamDefinition;

typedef struct {
    int id;
    int step_id;
    char limit_name[XDBS_MAX_STRING];
    char limit_type[XDBS_MAX_SMALL_STRING];
    char comparison_type[XDBS_MAX_SMALL_STRING];
    char limit_value[XDBS_MAX_STRING];
    char limit_min[XDBS_MAX_STRING];
    char limit_max[XDBS_MAX_STRING];
    char unit[XDBS_MAX_SMALL_STRING];
    char created_at[50];
} XDBS_StepLimitDefinition;

typedef struct {
    int id;
    char name[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    int depends_on;
    int has_depends_on;
    char created_at[50];
} XDBS_SequenceDefinition;

typedef struct {
    int id;
    int sequence_id;
    int step_id;
    int order_index;
    char created_at[50];
} XDBS_SequenceStepLink;

typedef struct {
    int id;
    int product_id;
    int sequence_id;
    int order_index;
    char created_at[50];
} XDBS_ProductSequenceLink;

typedef struct {
    int id;
    int product_id;
    int step_param_id;
    char value[XDBS_MAX_STRING];
    char created_at[50];
} XDBS_ProductStepParamValue;

typedef struct {
    int id;
    int product_id;
    int execution_mode_id;
    int sequence_id;
    int has_sequence_id;
    int step_id;
    int has_step_id;
    int is_active;
    int ignore_fail;
    int retry_on_fail;
    int repeat_count;
    int retry_delay_ms;
    char created_at[50];
} XDBS_ProductExecutionConfig;

typedef struct {
    int id;
    int product_id;
    char product_name[XDBS_MAX_STRING];
    int step_id;
    char step_name[XDBS_MAX_STRING];
    int instance_index;
    char instance_name[XDBS_MAX_STRING];
    char description[XDBS_MAX_LARGE_STRING];
    char physical_ref[XDBS_MAX_STRING];
    int is_active;
    char created_at[50];
} XDBS_ComponentInstance;

typedef struct {
    int id;
    int component_instance_id;
    int product_id;
    char product_name[XDBS_MAX_STRING];
    int step_id;
    char step_name[XDBS_MAX_STRING];
    int instance_index;
    char instance_name[XDBS_MAX_STRING];
    char physical_ref[XDBS_MAX_STRING];
    int step_limit_id;
    char limit_name[XDBS_MAX_STRING];
    char limit_type[XDBS_MAX_SMALL_STRING];
    char comparison_type[XDBS_MAX_SMALL_STRING];
    char default_limit_value[XDBS_MAX_STRING];
    char default_limit_min[XDBS_MAX_STRING];
    char default_limit_max[XDBS_MAX_STRING];
    char unit[XDBS_MAX_SMALL_STRING];
    char limit_value[XDBS_MAX_STRING];
    char limit_min[XDBS_MAX_STRING];
    char limit_max[XDBS_MAX_STRING];
    int is_active;
    int execution_mode_id;
    int has_execution_mode_id;
    char mode_name[XDBS_MAX_STRING];
    char created_at[50];
    char updated_at[50];
} XDBS_ProductStepLimitValue;

int xdbs_init(const char* api_url);
int xdbs_login(const char* username, const char* password);
void xdbs_set_token(const char* token);
const char* xdbs_get_token(void);
const char* xdbs_get_last_error(void);
void xdbs_cleanup(void);

int xdbs_get_products(XDBS_Product** products, int* count);
int xdbs_get_product_by_id(int id, XDBS_Product* product);
int xdbs_get_product_detail(int id, XDBS_ProductDetail* product);
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
);
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
);
int xdbs_delete_product(int id);
int xdbs_get_product_params(int product_id, XDBS_Param** params, int* count);
int xdbs_update_product_param(int product_id, int param_id, const char* value);
int xdbs_add_product_param(
    int product_id,
    const char* name,
    const char* type,
    const char* value,
    int* param_id
);
int xdbs_delete_product_param(int product_id, int param_id);
int xdbs_get_product_pipeline(
    int product_id,
    XDBS_Pipeline* preuut,
    XDBS_Pipeline* sequences,
    XDBS_Pipeline* postuut
);
int xdbs_update_product_pipeline(
    int product_id,
    const XDBS_Pipeline* preuut,
    const XDBS_Pipeline* sequences,
    const XDBS_Pipeline* postuut
);

int xdbs_get_steps(XDBS_Step** steps, int* count);
int xdbs_get_step_by_id(int id, XDBS_Step* step);
int xdbs_get_step_detail(int id, XDBS_StepDetail* step);
int xdbs_create_step(
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count,
    int* step_id
);
int xdbs_update_step(
    int id,
    const char* name,
    const char* description,
    const XDBS_Param* params,
    int param_count
);
int xdbs_delete_step(int id);
int xdbs_get_step_params(int step_id, XDBS_Param** params, int* count);
int xdbs_update_step_param(int step_id, int param_id, const char* value);
int xdbs_add_step_param(
    int step_id,
    const char* name,
    const char* type,
    const char* value,
    int* param_id
);
int xdbs_delete_step_param(int step_id, int param_id);

int xdbs_get_sequences(XDBS_Sequence** sequences, int* count);
int xdbs_get_sequence_by_id(int id, XDBS_Sequence* sequence);
int xdbs_get_sequence_steps(int sequence_id, int** step_ids, int* count);
int xdbs_create_sequence(
    const char* name,
    const char* description,
    const int* step_ids,
    int step_count,
    int* sequence_id
);
int xdbs_update_sequence(
    int id,
    const char* name,
    const char* description,
    const int* step_ids,
    int step_count
);
int xdbs_update_sequence_step_status(
    int sequence_id,
    int step_id,
    const char* status
);
int xdbs_set_step_status(int sequence_id, int step_id, const char* status);
int xdbs_delete_sequence(int id);

int xdbs_get_users(XDBS_UserInfo** users, int* count);
int xdbs_get_user_by_username(const char* username, XDBS_UserInfo* user);
int xdbs_create_user(
    const char* username,
    const char* password,
    const char* role,
    const char* email,
    const char* phone,
    const char* address,
    int can_login
);
int xdbs_update_user(
    const char* username,
    const char* email,
    const char* phone,
    const char* address,
    const char* status
);
int xdbs_delete_user(const char* username);
int xdbs_change_password(
    const char* username,
    const char* current_password,
    const char* new_password
);
int xdbs_reset_user_password(const char* username, const char* new_password);

int xdbs_get_roles(XDBS_Role** roles, int* count);
int xdbs_get_role_by_id(const char* role_id, XDBS_Role* role);
int xdbs_create_role(
    const char* role_id,
    const char* description,
    const char* const* rights,
    int right_count
);
int xdbs_update_role(
    const char* role_id,
    const char* description,
    const char* const* rights,
    int right_count
);
int xdbs_delete_role(const char* role_id);

int xdbs_get_rights(XDBS_Right** rights, int* count);
int xdbs_get_right_by_id(const char* right_id, XDBS_Right* right);
int xdbs_create_right(
    const char* right_id,
    const char* description,
    const char* module
);
int xdbs_update_right(
    const char* right_id,
    const char* description,
    const char* module
);
int xdbs_delete_right(const char* right_id);

int xdbs_get_history(XDBS_HistoryEntry** entries, int* count);
int xdbs_create_history_entry(
    const char* user_name,
    const char* action,
    const char* entity,
    int entity_id,
    const char* details
);

int xdbs_get_product_counters(XDBS_ProductCounter** counters, int* count);
int xdbs_get_product_counter(int product_id, XDBS_ProductCounter* counter);
int xdbs_create_product_counter(int product_id, int count);
int xdbs_update_product_counter(int product_id, int count);
int xdbs_delete_product_counter(int product_id);

int xdbs_get_product_statuses(XDBS_ProductStatus** statuses, int* count);
int xdbs_get_product_status(int status_id, XDBS_ProductStatus* status);
int xdbs_create_product_status(
    int product_id,
    const char* barcode,
    double duration,
    int failed,
    int mode_id,
    int* status_id
);
int xdbs_update_product_status(int status_id, double duration, int failed);
int xdbs_delete_product_status(int status_id);

int xdbs_get_statuses(XDBS_Status** statuses, int* count);
int xdbs_get_status(int id, XDBS_Status* status);
int xdbs_create_status(int item_id, int terminated, int* id);
int xdbs_update_status(int id, int terminated);
int xdbs_delete_status(int id);

int xdbs_get_step_statuses(XDBS_StepStatus** statuses, int* count);
int xdbs_get_step_status(int status_id, XDBS_StepStatus* status);
int xdbs_create_step_status(
    int product_id,
    int test_id,
    int parameter_id,
    int vtype,
    double dvalue,
    int ivalue,
    const char* svalue,
    int* status_id
);
int xdbs_update_step_status(int status_id, double dvalue, int ivalue, const char* svalue);
int xdbs_delete_step_status(int status_id);

int xdbs_get_execution_modes(XDBS_ExecutionMode** modes, int* count);
int xdbs_get_execution_mode(int id, XDBS_ExecutionMode* mode);
int xdbs_create_execution_mode(const char* name, const char* description, int* id);
int xdbs_update_execution_mode(int id, const char* name, const char* description);
int xdbs_delete_execution_mode(int id);

int xdbs_get_step_definitions(XDBS_StepDefinition** steps, int* count);
int xdbs_get_step_definition(int id, XDBS_StepDefinition* step);
int xdbs_create_step_definition(const char* name, const char* description, int depends_on, int* id);
int xdbs_update_step_definition(int id, const char* name, const char* description, int depends_on);
int xdbs_delete_step_definition(int id);

int xdbs_get_step_param_definitions(XDBS_StepParamDefinition** params, int* count);
int xdbs_get_step_param_definition(int id, XDBS_StepParamDefinition* param);
int xdbs_create_step_param_definition(int step_id, const char* name, const char* type, const char* default_value, int* id);
int xdbs_update_step_param_definition(int id, int step_id, const char* name, const char* type, const char* default_value);
int xdbs_delete_step_param_definition(int id);

int xdbs_get_step_limit_definitions(XDBS_StepLimitDefinition** limits, int* count);
int xdbs_get_step_limit_definition(int id, XDBS_StepLimitDefinition* limit);
int xdbs_create_step_limit_definition(int step_id, const char* name, const char* type, const char* comparison_type, const char* value, const char* min, const char* max, const char* unit, int* id);
int xdbs_update_step_limit_definition(int id, int step_id, const char* name, const char* type, const char* comparison_type, const char* value, const char* min, const char* max, const char* unit);
int xdbs_delete_step_limit_definition(int id);

int xdbs_get_sequence_definitions(XDBS_SequenceDefinition** sequences, int* count);
int xdbs_get_sequence_definition(int id, XDBS_SequenceDefinition* sequence);
int xdbs_create_sequence_definition(const char* name, const char* description, int depends_on, int* id);
int xdbs_update_sequence_definition(int id, const char* name, const char* description, int depends_on);
int xdbs_delete_sequence_definition(int id);

int xdbs_get_sequence_step_links(XDBS_SequenceStepLink** links, int* count);
int xdbs_get_sequence_step_link(int id, XDBS_SequenceStepLink* link);
int xdbs_create_sequence_step_link(int sequence_id, int step_id, int order_index, int* id);
int xdbs_update_sequence_step_link(int id, int sequence_id, int step_id, int order_index);
int xdbs_delete_sequence_step_link(int id);

int xdbs_get_product_sequence_links(XDBS_ProductSequenceLink** links, int* count);
int xdbs_get_product_sequence_link(int id, XDBS_ProductSequenceLink* link);
int xdbs_create_product_sequence_link(int product_id, int sequence_id, int order_index, int* id);
int xdbs_update_product_sequence_link(int id, int product_id, int sequence_id, int order_index);
int xdbs_delete_product_sequence_link(int id);

int xdbs_get_product_step_param_values(XDBS_ProductStepParamValue** values, int* count);
int xdbs_get_product_step_param_value(int id, XDBS_ProductStepParamValue* value);
int xdbs_create_product_step_param_value(int product_id, int step_param_id, const char* value, int* id);
int xdbs_update_product_step_param_value(int id, int product_id, int step_param_id, const char* value);
int xdbs_delete_product_step_param_value(int id);

int xdbs_get_product_execution_configs(XDBS_ProductExecutionConfig** configs, int* count);
int xdbs_get_product_execution_config(int id, XDBS_ProductExecutionConfig* config);
int xdbs_create_product_execution_config(int product_id, int execution_mode_id, int sequence_id, int step_id, int is_active, int ignore_fail, int retry_on_fail, int repeat_count, int retry_delay_ms, int* id);
int xdbs_update_product_execution_config(int id, int product_id, int execution_mode_id, int sequence_id, int step_id, int is_active, int ignore_fail, int retry_on_fail, int repeat_count, int retry_delay_ms);
int xdbs_delete_product_execution_config(int id);

int xdbs_get_component_instances(XDBS_ComponentInstance** instances, int* count);
int xdbs_get_component_instance(int id, XDBS_ComponentInstance* instance);
int xdbs_create_component_instance(int product_id, int step_id, int instance_index, const char* instance_name, const char* description, const char* physical_ref, int is_active, int* id);
int xdbs_update_component_instance(int id, int product_id, int step_id, int instance_index, const char* instance_name, const char* description, const char* physical_ref, int is_active);
int xdbs_delete_component_instance(int id);

int xdbs_get_product_step_limit_values(XDBS_ProductStepLimitValue** values, int* count);
int xdbs_get_product_step_limit_value(int id, XDBS_ProductStepLimitValue* value);
int xdbs_create_product_step_limit_value(int component_instance_id, int step_limit_id, const char* limit_value, const char* limit_min, const char* limit_max, int is_active, int execution_mode_id, int* id);
int xdbs_update_product_step_limit_value(int id, int component_instance_id, int step_limit_id, const char* limit_value, const char* limit_min, const char* limit_max, int is_active, int execution_mode_id);
int xdbs_delete_product_step_limit_value(int id);

int xdbs_upload_avatar(const char* username, const char* file_path);
int xdbs_delete_avatar(const char* username);

void xdbs_free_params(XDBS_Param* params);
void xdbs_free_pipeline(XDBS_Pipeline* pipeline);
void xdbs_free_product(XDBS_Product* product);
void xdbs_free_products(XDBS_Product* products, int count);
void xdbs_free_step(XDBS_Step* step);
void xdbs_free_steps(XDBS_Step* steps, int count);
void xdbs_free_sequence(XDBS_Sequence* sequence);
void xdbs_free_sequences(XDBS_Sequence* sequences, int count);
void xdbs_free_users(XDBS_UserInfo* users);
void xdbs_free_roles(XDBS_Role* roles);
void xdbs_free_rights(XDBS_Right* rights);
void xdbs_free_history_entries(XDBS_HistoryEntry* entries);
void xdbs_free_product_counters(XDBS_ProductCounter* counters);
void xdbs_free_product_statuses(XDBS_ProductStatus* statuses);
void xdbs_free_statuses(XDBS_Status* statuses);
void xdbs_free_step_statuses(XDBS_StepStatus* statuses);
void xdbs_free_execution_modes(XDBS_ExecutionMode* modes, int count);
void xdbs_free_step_definitions(XDBS_StepDefinition* steps, int count);
void xdbs_free_step_param_definitions(XDBS_StepParamDefinition* params, int count);
void xdbs_free_step_limit_definitions(XDBS_StepLimitDefinition* limits, int count);
void xdbs_free_sequence_definitions(XDBS_SequenceDefinition* sequences, int count);
void xdbs_free_sequence_step_links(XDBS_SequenceStepLink* links, int count);
void xdbs_free_product_sequence_links(XDBS_ProductSequenceLink* links, int count);
void xdbs_free_product_step_param_values(XDBS_ProductStepParamValue* values, int count);
void xdbs_free_product_execution_configs(XDBS_ProductExecutionConfig* configs, int count);
void xdbs_free_component_instances(XDBS_ComponentInstance* instances, int count);
void xdbs_free_product_step_limit_values(XDBS_ProductStepLimitValue* values, int count);

#ifdef __cplusplus
}
#endif

#endif
