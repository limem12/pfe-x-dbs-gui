#include "x_dbs_api.h"

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

static void print_separator(const char* title) {
    printf("\n==============================================================================\n");
    printf("%s\n", title);
    printf("==============================================================================\n");
}

static void print_status_line(const char* prefix, const char* format, va_list args) {
    printf("  %s ", prefix);
    vprintf(format, args);
    printf("\n");
}

static void print_success(const char* format, ...) {
    va_list args;

    va_start(args, format);
    print_status_line("[OK]", format, args);
    va_end(args);
}

static void print_info(const char* format, ...) {
    va_list args;

    va_start(args, format);
    print_status_line("[INFO]", format, args);
    va_end(args);
}

static void print_error(const char* action) {
    printf("  [ERR] %s: %s\n", action, xdbs_get_last_error());
}

static const char* getenv_or_default(const char* name, const char* fallback) {
    const char* value = getenv(name);
    return (value && value[0] != '\0') ? value : fallback;
}

static void build_unique_name(char* buffer, size_t buffer_size, const char* prefix) {
    unsigned long long stamp = (unsigned long long)time(NULL);
    unsigned long long tick = (unsigned long long)clock();

    snprintf(buffer, buffer_size, "%s_%llu_%llu", prefix, stamp, tick);
}

static int create_reference_step(const char* name, int* step_id) {
    XDBS_Param params[1];

    memset(params, 0, sizeof(params));
    snprintf(params[0].name, sizeof(params[0].name), "ref_value");
    snprintf(params[0].type, sizeof(params[0].type), "String");
    snprintf(params[0].value, sizeof(params[0].value), "%s", name);

    return xdbs_create_step(name, "Reference step for CRUD test", params, 1, step_id);
}

static int is_admin_role_name(const char* role_id) {
    return role_id &&
        (_stricmp(role_id, "ADMIN") == 0 || _stricmp(role_id, "Admin") == 0);
}

static void select_existing_role_id(char* buffer, size_t buffer_size) {
    XDBS_Role* roles = NULL;
    int role_count = 0;
    int index = 0;

    if (!buffer || buffer_size == 0U) {
        return;
    }

    buffer[0] = '\0';

    if (xdbs_get_roles(&roles, &role_count) != 0 || role_count == 0) {
        xdbs_free_roles(roles);
        return;
    }

    for (index = 0; index < role_count; ++index) {
        if (!is_admin_role_name(roles[index].id_role)) {
            snprintf(buffer, buffer_size, "%s", roles[index].id_role);
            break;
        }
    }

    if (buffer[0] == '\0') {
        snprintf(buffer, buffer_size, "%s", roles[0].id_role);
    }

    xdbs_free_roles(roles);
}

int main(int argc, char** argv) {
    const char* api_url = getenv_or_default("XDBS_API_URL", "http://localhost:3002/api");
    const char* login_username = getenv_or_default("XDBS_USERNAME", "Admin");
    const char* login_password = getenv("XDBS_PASSWORD");
    char admin_username[XDBS_MAX_STRING];
    char admin_password[XDBS_MAX_STRING];
    char product_name[XDBS_MAX_STRING];
    char step_name[XDBS_MAX_STRING];
    char sequence_name[XDBS_MAX_STRING];
    char test_username[XDBS_MAX_STRING];
    char selected_user_role[XDBS_MAX_STRING];
    char test_role_id[XDBS_MAX_STRING];
    char test_right_id[XDBS_MAX_STRING];
    char pipeline_product_name[XDBS_MAX_STRING];
    char pipeline_sequence_name[XDBS_MAX_STRING];
    char limit_product_name[XDBS_MAX_STRING];
    char limit_step_name[XDBS_MAX_STRING];
    int failure_count = 0;
    int product_id = 0;
    int step_id = 0;
    int sequence_id = 0;
    int pipeline_product_id = 0;
    int pipeline_sequence_id = 0;
    int pipeline_pre_step_id = 0;
    int pipeline_seq_step_a_id = 0;
    int pipeline_seq_step_b_id = 0;
    int pipeline_post_step_id = 0;
    int limit_product_id = 0;
    int limit_step_id = 0;
    int limit_definition_id = 0;
    int component_instance_id = 0;
    int product_step_limit_id = 0;
    int seq_step_a_id = 0;
    int seq_step_b_id = 0;
    int created_right = 0;
    int created_role = 0;
    int created_user = 0;
    int created_product = 0;
    int created_step = 0;
    int created_sequence = 0;
    int created_pipeline_product = 0;
    int created_pipeline_sequence = 0;
    int created_limit_product = 0;
    memset(admin_username, 0, sizeof(admin_username));
    memset(admin_password, 0, sizeof(admin_password));
    memset(product_name, 0, sizeof(product_name));
    memset(step_name, 0, sizeof(step_name));
    memset(sequence_name, 0, sizeof(sequence_name));
    memset(test_username, 0, sizeof(test_username));
    memset(selected_user_role, 0, sizeof(selected_user_role));
    memset(test_role_id, 0, sizeof(test_role_id));
    memset(test_right_id, 0, sizeof(test_right_id));
    memset(pipeline_product_name, 0, sizeof(pipeline_product_name));
    memset(pipeline_sequence_name, 0, sizeof(pipeline_sequence_name));
    memset(limit_product_name, 0, sizeof(limit_product_name));
    memset(limit_step_name, 0, sizeof(limit_step_name));

    if (argc >= 3) {
        login_username = argv[1];
        login_password = argv[2];
    }
    if (argc >= 4) {
        api_url = argv[3];
    }

    if (!login_password || login_password[0] == '\0') {
        fprintf(stderr,
            "Set XDBS_PASSWORD before running, or pass credentials as:\n"
            "  build/xdbs_test.exe <username> <password> [api_url]\n");
        return 1;
    }

    snprintf(admin_username, sizeof(admin_username), "%s", login_username);
    snprintf(admin_password, sizeof(admin_password), "%s", login_password);

    build_unique_name(product_name, sizeof(product_name), "c_product");
    build_unique_name(step_name, sizeof(step_name), "c_step");
    build_unique_name(sequence_name, sizeof(sequence_name), "c_sequence");
    build_unique_name(test_username, sizeof(test_username), "c_user");
    build_unique_name(test_role_id, sizeof(test_role_id), "C_ROLE");
    build_unique_name(test_right_id, sizeof(test_right_id), "C_RIGHT");
    build_unique_name(pipeline_product_name, sizeof(pipeline_product_name), "c_pipeline_product");
    build_unique_name(pipeline_sequence_name, sizeof(pipeline_sequence_name), "c_pipeline_sequence");
    build_unique_name(limit_product_name, sizeof(limit_product_name), "c_limit_product");
    build_unique_name(limit_step_name, sizeof(limit_step_name), "c_limit_step");

    print_separator("X-DBS C API Wrapper - CRUD Integration Test");
    print_info("API URL    : %s", api_url);
    print_info("Login user : %s", login_username);

    print_separator("1. Initialization and Authentication");
    if (xdbs_init(api_url) != 0) {
        print_error("Initialization");
        return 1;
    }
    print_success("API client initialized");

    if (xdbs_login(login_username, login_password) != 0) {
        print_error("Login");
        xdbs_cleanup();
        return 1;
    }
    print_success("Authenticated successfully");

    select_existing_role_id(selected_user_role, sizeof(selected_user_role));
    if (selected_user_role[0] != '\0') {
        print_info("Using existing role for temp user: %s", selected_user_role);
    } else {
        print_info("No role could be preselected; backend default will be used");
    }

    print_separator("2. Products - CRUD");
    {
        XDBS_Param params[1];
        XDBS_Product product;
        XDBS_Param* product_params = NULL;
        int product_param_count = 0;
        int extra_param_id = 0;

        memset(params, 0, sizeof(params));
        memset(&product, 0, sizeof(product));
        snprintf(params[0].name, sizeof(params[0].name), "serial");
        snprintf(params[0].type, sizeof(params[0].type), "String");
        snprintf(params[0].value, sizeof(params[0].value), "P-002");

        if (xdbs_create_product(
                product_name,
                "Created by the C CRUD test",
                params,
                1,
                NULL,
                0,
                NULL,
                0,
                NULL,
                0,
                &product_id) == 0) {
            created_product = 1;
            print_success("Created product id=%d", product_id);

            if (xdbs_get_product_by_id(product_id, &product) == 0) {
                print_success("Read product name=%s", product.name);
                xdbs_free_product(&product);
            } else {
                ++failure_count;
                print_error("Read product");
            }

            if (xdbs_update_product(
                    product_id,
                    "c_product_updated",
                    "Updated by the C CRUD test",
                    params,
                    1,
                    NULL,
                    0,
                    NULL,
                    0,
                    NULL,
                    0) == 0) {
                print_success("Updated product");
            } else {
                ++failure_count;
                print_error("Update product");
            }

            if (xdbs_get_product_params(product_id, &product_params, &product_param_count) == 0 &&
                product_param_count > 0) {
                if (xdbs_update_product_param(product_id, product_params[0].id, "P-002") == 0) {
                    print_success("Updated product parameter id=%d", product_params[0].id);
                } else {
                    ++failure_count;
                    print_error("Update product parameter");
                }
            } else {
                ++failure_count;
                print_error("Read product parameters");
            }
            xdbs_free_params(product_params);

            if (xdbs_add_product_param(product_id, "lot", "String", "LOT-42", &extra_param_id) == 0) {
                print_success("Added product parameter id=%d", extra_param_id);
            } else {
                ++failure_count;
                print_error("Add product parameter");
            }

            if (extra_param_id > 0) {
                if (xdbs_delete_product_param(product_id, extra_param_id) == 0) {
                    print_success("Deleted product parameter id=%d", extra_param_id);
                } else {
                    ++failure_count;
                    print_error("Delete product parameter");
                }
            }

            if (xdbs_delete_product(product_id) == 0) {
                created_product = 0;
                product_id = 0;
                print_success("Deleted product");
            } else {
                ++failure_count;
                print_error("Delete product");
            }
        } else {
            ++failure_count;
            print_error("Create product");
        }
    }

    print_separator("3. Steps - CRUD");
    {
        XDBS_Param params[2];
        XDBS_Step step;
        XDBS_Param* step_params = NULL;
        int step_param_count = 0;
        int extra_param_id = 0;

        memset(params, 0, sizeof(params));
        memset(&step, 0, sizeof(step));

        snprintf(params[0].name, sizeof(params[0].name), "voltage");
        snprintf(params[0].type, sizeof(params[0].type), "Float");
        snprintf(params[0].value, sizeof(params[0].value), "12.5");

        snprintf(params[1].name, sizeof(params[1].name), "current");
        snprintf(params[1].type, sizeof(params[1].type), "Integer");
        snprintf(params[1].value, sizeof(params[1].value), "220");

        if (xdbs_create_step(step_name, "Created by the C CRUD test", params, 2, &step_id) == 0) {
            created_step = 1;
            print_success("Created step id=%d", step_id);

            if (xdbs_get_step_by_id(step_id, &step) == 0) {
                print_success("Read step name=%s", step.name);

                if (xdbs_update_step(
                        step_id,
                        "c_step_updated",
                        "Updated by the C CRUD test",
                        step.params,
                        step.param_count) == 0) {
                    print_success("Updated step");
                } else {
                    ++failure_count;
                    print_error("Update step");
                }

                xdbs_free_step(&step);
            } else {
                ++failure_count;
                print_error("Read step");
            }

            if (xdbs_get_step_params(step_id, &step_params, &step_param_count) == 0 &&
                step_param_count > 0) {
                if (xdbs_update_step_param(step_id, step_params[0].id, "15.0") == 0) {
                    print_success("Updated step parameter id=%d", step_params[0].id);
                } else {
                    ++failure_count;
                    print_error("Update step parameter");
                }
            } else {
                ++failure_count;
                print_error("Read step parameters");
            }
            xdbs_free_params(step_params);

            if (xdbs_add_step_param(step_id, "mode", "String", "AUTO", &extra_param_id) == 0) {
                print_success("Added step parameter id=%d", extra_param_id);
            } else {
                ++failure_count;
                print_error("Add step parameter");
            }

            if (extra_param_id > 0) {
                if (xdbs_delete_step_param(step_id, extra_param_id) == 0) {
                    print_success("Deleted step parameter id=%d", extra_param_id);
                } else {
                    ++failure_count;
                    print_error("Delete step parameter");
                }
            }

            if (xdbs_delete_step(step_id) == 0) {
                created_step = 0;
                step_id = 0;
                print_success("Deleted step");
            } else {
                ++failure_count;
                print_error("Delete step");
            }
        } else {
            ++failure_count;
            print_error("Create step");
        }
    }

    print_separator("4. Sequences - CRUD");
    {
        int step_ids[2];
        XDBS_Sequence sequence;
        int* read_step_ids = NULL;
        int read_step_count = 0;

        memset(step_ids, 0, sizeof(step_ids));
        memset(&sequence, 0, sizeof(sequence));

        if (create_reference_step("c_seq_step_a", &seq_step_a_id) == 0 &&
            create_reference_step("c_seq_step_b", &seq_step_b_id) == 0) {
            step_ids[0] = seq_step_a_id;
            step_ids[1] = seq_step_b_id;

            if (xdbs_create_sequence(sequence_name, "Created by the C CRUD test", step_ids, 2, &sequence_id) == 0) {
                created_sequence = 1;
                print_success("Created sequence id=%d", sequence_id);

                if (xdbs_get_sequence_by_id(sequence_id, &sequence) == 0) {
                    print_success("Read sequence name=%s step_count=%d", sequence.name, sequence.step_count);
                    xdbs_free_sequence(&sequence);
                } else {
                    ++failure_count;
                    print_error("Read sequence");
                }

                if (xdbs_update_sequence(
                        sequence_id,
                        "c_sequence_updated",
                        "Updated by the C CRUD test",
                        step_ids,
                        2) == 0) {
                    print_success("Updated sequence");
                } else {
                    ++failure_count;
                    print_error("Update sequence");
                }

                if (xdbs_get_sequence_steps(sequence_id, &read_step_ids, &read_step_count) == 0) {
                    print_success("Read sequence step list count=%d", read_step_count);
                } else {
                    ++failure_count;
                    print_error("Read sequence step ids");
                }
                free(read_step_ids);

                if (xdbs_delete_sequence(sequence_id) == 0) {
                    created_sequence = 0;
                    sequence_id = 0;
                    print_success("Deleted sequence");
                } else {
                    ++failure_count;
                    print_error("Delete sequence");
                }
            } else {
                ++failure_count;
                print_error("Create sequence");
            }
        } else {
            ++failure_count;
            print_error("Create reference steps for sequence");
        }

        if (seq_step_a_id > 0) {
            if (xdbs_delete_step(seq_step_a_id) == 0) {
                print_success("Deleted sequence reference step id=%d", seq_step_a_id);
                seq_step_a_id = 0;
            }
        }
        if (seq_step_b_id > 0) {
            if (xdbs_delete_step(seq_step_b_id) == 0) {
                print_success("Deleted sequence reference step id=%d", seq_step_b_id);
                seq_step_b_id = 0;
            }
        }
    }

    print_separator("5. Users - CRUD");
    {
        XDBS_UserInfo user;

        memset(&user, 0, sizeof(user));

        if (xdbs_create_user(
                test_username,
                "Password123",
                selected_user_role[0] != '\0' ? selected_user_role : NULL,
                "user@example.com",
                "0600000000",
                "Paris",
                1) == 0) {
            created_user = 1;
            print_success("Created user username=%s", test_username);

            if (xdbs_get_user_by_username(test_username, &user) == 0) {
                print_success("Read user username=%s role=%s", user.username, user.role);
            } else {
                ++failure_count;
                print_error("Read user");
            }

            if (xdbs_update_user(
                    test_username,
                    "user@example.com",
                    "0611111111",
                    "Lyon",
                    "ENABLED") == 0) {
                print_success("Updated user profile");
            } else {
                ++failure_count;
                print_error("Update user");
            }

            if (xdbs_reset_user_password(test_username, "ResetPass123") == 0) {
                print_success("Reset user password");
            } else {
                ++failure_count;
                print_error("Reset user password");
            }

            if (xdbs_login(test_username, "ResetPass123") == 0) {
                print_success("Logged in as temporary user");

                if (xdbs_change_password(test_username, "ResetPass123", "FinalPass123") == 0) {
                    print_success("Changed temporary user password");
                } else {
                    ++failure_count;
                    print_error("Change user password");
                }
            } else {
                ++failure_count;
                print_error("Login as temporary user");
            }

            if (xdbs_login(admin_username, admin_password) == 0) {
                print_success("Restored admin session");
            } else {
                ++failure_count;
                print_error("Restore admin session");
            }

            if (xdbs_update_user(test_username, NULL, NULL, NULL, "DISABLED") == 0) {
                print_success("Disabled temporary user");
            } else {
                ++failure_count;
                print_error("Disable temporary user");
            }

            if (xdbs_delete_user(test_username) == 0) {
                created_user = 0;
                print_success("Deleted temporary user");
            } else {
                ++failure_count;
                print_error("Delete user");
            }
        } else {
            ++failure_count;
            print_error("Create user");
        }
    }

    print_separator("6. Rights - CRUD");
    {
        XDBS_Right right;

        memset(&right, 0, sizeof(right));

        if (xdbs_create_right(test_right_id, "Temporary right created by the C CRUD test", "C_WRAPPER") == 0) {
            created_right = 1;
            print_success("Created right id=%s", test_right_id);

            if (xdbs_get_right_by_id(test_right_id, &right) == 0) {
                print_success("Read right id=%s module=%s", right.id_right, right.module);
            } else {
                ++failure_count;
                print_error("Read right");
            }

            if (xdbs_update_right(test_right_id, "Temporary right updated by the C CRUD test", "C_WRAPPER_V2") == 0) {
                print_success("Updated right");
            } else {
                ++failure_count;
                print_error("Update right");
            }

            if (xdbs_delete_right(test_right_id) == 0) {
                created_right = 0;
                print_success("Deleted right");
            } else {
                ++failure_count;
                print_error("Delete right");
            }
        } else {
            ++failure_count;
            print_error("Create right");
        }
    }

    print_separator("7. Roles - CRUD");
    {
        XDBS_Right* rights_catalog = NULL;
        int right_count = 0;

        if (xdbs_get_rights(&rights_catalog, &right_count) == 0 && right_count > 0) {
            const char* create_rights[2];
            const char* update_rights[3];
            int create_count = right_count >= 2 ? 2 : 1;
            int update_count = right_count >= 3 ? 3 : create_count;
            XDBS_Role role;

            memset(&role, 0, sizeof(role));

            create_rights[0] = rights_catalog[0].id_right;
            create_rights[1] = create_count > 1 ? rights_catalog[1].id_right : rights_catalog[0].id_right;

            update_rights[0] = rights_catalog[0].id_right;
            update_rights[1] = update_count > 1 ? rights_catalog[1].id_right : rights_catalog[0].id_right;
            update_rights[2] = update_count > 2 ? rights_catalog[2].id_right : update_rights[update_count - 1];

            if (xdbs_create_role(test_role_id, "Temporary role created by the C CRUD test", create_rights, create_count) == 0) {
                created_role = 1;
                print_success("Created role id=%s", test_role_id);

                if (xdbs_get_role_by_id(test_role_id, &role) == 0) {
                    print_success("Read role id=%s", role.id_role);
                } else {
                    ++failure_count;
                    print_error("Read role");
                }

                if (xdbs_update_role(test_role_id, "Temporary role updated by the C CRUD test", update_rights, update_count) == 0) {
                    print_success("Updated role");
                } else {
                    ++failure_count;
                    print_error("Update role");
                }

                if (xdbs_delete_role(test_role_id) == 0) {
                    created_role = 0;
                    print_success("Deleted role");
                } else {
                    ++failure_count;
                    print_error("Delete role");
                }
            } else {
                ++failure_count;
                print_error("Create role");
            }

            xdbs_free_rights(rights_catalog);
        } else {
            ++failure_count;
            print_error("Load rights catalog for role test");
        }
    }

    print_separator("8. History - Create and Read");
    {
        XDBS_HistoryEntry* history = NULL;
        int history_count = 0;

        if (xdbs_create_history_entry(admin_username, "Creation", "User", 0, "C wrapper CRUD test executed") == 0) {
            print_success("Created history entry");
        } else {
            ++failure_count;
            print_error("Create history entry");
        }

        if (xdbs_get_history(&history, &history_count) == 0) {
            print_success("Read history count=%d", history_count);
            xdbs_free_history_entries(history);
        } else {
            ++failure_count;
            print_error("Read history");
        }
    }

    print_separator("9. Product Pipeline");
    {
        int pre_ids[1];
        int sequence_ids[1];
        int post_ids[1];
        int sequence_step_ids[2];
        XDBS_Pipeline preuut;
        XDBS_Pipeline sequences;
        XDBS_Pipeline postuut;
        XDBS_Param product_params[1];

        memset(&preuut, 0, sizeof(preuut));
        memset(&sequences, 0, sizeof(sequences));
        memset(&postuut, 0, sizeof(postuut));
        memset(product_params, 0, sizeof(product_params));

        snprintf(product_params[0].name, sizeof(product_params[0].name), "profile");
        snprintf(product_params[0].type, sizeof(product_params[0].type), "String");
        snprintf(product_params[0].value, sizeof(product_params[0].value), "pipeline");

        if (create_reference_step("c_pipeline_pre", &pipeline_pre_step_id) == 0 &&
            create_reference_step("c_pipeline_seq_a", &pipeline_seq_step_a_id) == 0 &&
            create_reference_step("c_pipeline_seq_b", &pipeline_seq_step_b_id) == 0 &&
            create_reference_step("c_pipeline_post", &pipeline_post_step_id) == 0) {
            sequence_step_ids[0] = pipeline_seq_step_a_id;
            sequence_step_ids[1] = pipeline_seq_step_b_id;

            if (xdbs_create_sequence(
                    pipeline_sequence_name,
                    "Temporary sequence for pipeline test",
                    sequence_step_ids,
                    2,
                    &pipeline_sequence_id) == 0) {
                created_pipeline_sequence = 1;

                pre_ids[0] = pipeline_pre_step_id;
                sequence_ids[0] = pipeline_sequence_id;
                post_ids[0] = pipeline_post_step_id;

                if (xdbs_create_product(
                        pipeline_product_name,
                        "Temporary product for pipeline test",
                        product_params,
                        1,
                        pre_ids,
                        1,
                        sequence_ids,
                        1,
                        post_ids,
                        1,
                        &pipeline_product_id) == 0) {
                    created_pipeline_product = 1;
                    print_success("Created pipeline product id=%d", pipeline_product_id);

                    if (xdbs_get_product_pipeline(pipeline_product_id, &preuut, &sequences, &postuut) == 0) {
                        print_success(
                            "Read pipeline pre=%d sequences=%d post=%d",
                            preuut.count,
                            sequences.count,
                            postuut.count);
                    } else {
                        ++failure_count;
                        print_error("Read pipeline");
                    }

                    if (xdbs_update_product_pipeline(pipeline_product_id, &preuut, &sequences, &postuut) == 0) {
                        print_success("Updated pipeline using current values");
                    } else {
                        ++failure_count;
                        print_error("Update pipeline");
                    }

                    {
                        XDBS_ProductExecutionConfig* configs = NULL;
                        XDBS_ExecutionMode* modes = NULL;
                        int config_count = 0;
                        int mode_count = 0;
                        int product_config_count = 0;
                        int expected_config_count = 0;
                        int index = 0;

                        if (xdbs_get_execution_modes(&modes, &mode_count) == 0 &&
                            xdbs_get_product_execution_configs(&configs, &config_count) == 0) {
                            for (index = 0; index < config_count; ++index) {
                                if (configs[index].product_id == pipeline_product_id) {
                                    ++product_config_count;
                                }
                            }

                            expected_config_count = mode_count * (
                                preuut.count +
                                sequences.count +
                                postuut.count +
                                2
                            );

                            if (product_config_count >= expected_config_count) {
                                print_success(
                                    "Generated execution configs for product: %d/%d",
                                    product_config_count,
                                    expected_config_count);
                            } else {
                                ++failure_count;
                                print_error("Generated execution configs for pipeline product");
                            }
                        } else {
                            ++failure_count;
                            print_error("Load execution configs for pipeline product");
                        }

                        xdbs_free_product_execution_configs(configs, config_count);
                        xdbs_free_execution_modes(modes, mode_count);
                    }

                    if (xdbs_delete_product(pipeline_product_id) == 0) {
                        created_pipeline_product = 0;
                        pipeline_product_id = 0;
                        print_success("Deleted pipeline product");
                    } else {
                        ++failure_count;
                        print_error("Delete pipeline product");
                    }
                } else {
                    ++failure_count;
                    print_error("Create pipeline product");
                }

                if (xdbs_delete_sequence(pipeline_sequence_id) == 0) {
                    created_pipeline_sequence = 0;
                    pipeline_sequence_id = 0;
                    print_success("Deleted pipeline sequence");
                } else {
                    ++failure_count;
                    print_error("Delete pipeline sequence");
                }
            } else {
                ++failure_count;
                print_error("Create pipeline sequence");
            }
        } else {
            ++failure_count;
            print_error("Create pipeline reference steps");
        }

        xdbs_free_pipeline(&preuut);
        xdbs_free_pipeline(&sequences);
        xdbs_free_pipeline(&postuut);

        if (pipeline_pre_step_id > 0) {
            if (xdbs_delete_step(pipeline_pre_step_id) == 0) {
                print_success("Deleted pipeline pre step id=%d", pipeline_pre_step_id);
                pipeline_pre_step_id = 0;
            }
        }
        if (pipeline_seq_step_a_id > 0) {
            if (xdbs_delete_step(pipeline_seq_step_a_id) == 0) {
                print_success("Deleted pipeline sequence step id=%d", pipeline_seq_step_a_id);
                pipeline_seq_step_a_id = 0;
            }
        }
        if (pipeline_seq_step_b_id > 0) {
            if (xdbs_delete_step(pipeline_seq_step_b_id) == 0) {
                print_success("Deleted pipeline sequence step id=%d", pipeline_seq_step_b_id);
                pipeline_seq_step_b_id = 0;
            }
        }
        if (pipeline_post_step_id > 0) {
            if (xdbs_delete_step(pipeline_post_step_id) == 0) {
                print_success("Deleted pipeline post step id=%d", pipeline_post_step_id);
                pipeline_post_step_id = 0;
            }
        }
    }

    print_separator("10. Product Limit Values and Component Instances");
    {
        XDBS_Param limit_step_params[1];
        XDBS_ComponentInstance component_instance;
        XDBS_ProductStepLimitValue product_limit_value;
        XDBS_ExecutionMode* modes = NULL;
        int mode_count = 0;
        int execution_mode_id = -1;
        int pre_ids[1];

        memset(limit_step_params, 0, sizeof(limit_step_params));
        memset(&component_instance, 0, sizeof(component_instance));
        memset(&product_limit_value, 0, sizeof(product_limit_value));
        memset(pre_ids, 0, sizeof(pre_ids));

        snprintf(limit_step_params[0].name, sizeof(limit_step_params[0].name), "limit_ref");
        snprintf(limit_step_params[0].type, sizeof(limit_step_params[0].type), "String");
        snprintf(limit_step_params[0].value, sizeof(limit_step_params[0].value), "NBV");

        if (xdbs_get_execution_modes(&modes, &mode_count) == 0 && mode_count > 0) {
            execution_mode_id = modes[0].id;
            print_info("Selected execution mode id=%d name=%s", execution_mode_id, modes[0].name);
        } else {
            print_info("No execution mode available; product limit value will use a NULL mode");
        }
        xdbs_free_execution_modes(modes, mode_count);

        if (xdbs_create_step(
                limit_step_name,
                "Step used by the C limit value test",
                limit_step_params,
                1,
                &limit_step_id) == 0) {
            print_success("Created limit test step id=%d", limit_step_id);

            if (xdbs_create_step_limit_definition(
                    limit_step_id,
                    "NBV",
                    "NUMERIC",
                    "EQ",
                    "2",
                    NULL,
                    NULL,
                    "V",
                    &limit_definition_id) == 0) {
                print_success("Created generic step limit id=%d", limit_definition_id);

                pre_ids[0] = limit_step_id;
                if (xdbs_create_product(
                        limit_product_name,
                        "Product used by the C limit value test",
                        NULL,
                        0,
                        pre_ids,
                        1,
                        NULL,
                        0,
                        NULL,
                        0,
                        &limit_product_id) == 0) {
                    created_limit_product = 1;
                    print_success("Created limit test product id=%d", limit_product_id);

                    if (xdbs_create_component_instance(
                            limit_product_id,
                            limit_step_id,
                            1,
                            "R1",
                            "Component instance created by the C wrapper",
                            "U1.R1",
                            1,
                            &component_instance_id) == 0) {
                        print_success("Created component instance id=%d", component_instance_id);

                        if (xdbs_get_component_instance(component_instance_id, &component_instance) == 0) {
                            print_success(
                                "Read component instance name=%s order=%d ref=%s",
                                component_instance.instance_name,
                                component_instance.instance_index,
                                component_instance.physical_ref);
                        } else {
                            ++failure_count;
                            print_error("Read component instance");
                        }

                        if (xdbs_update_component_instance(
                                component_instance_id,
                                limit_product_id,
                                limit_step_id,
                                2,
                                "R1_UPDATED",
                                "Updated by the C wrapper",
                                "U1.R1",
                                1) == 0) {
                            print_success("Updated component instance");
                        } else {
                            ++failure_count;
                            print_error("Update component instance");
                        }

                        if (xdbs_create_product_step_limit_value(
                                component_instance_id,
                                limit_definition_id,
                                "2.1",
                                NULL,
                                NULL,
                                1,
                                execution_mode_id,
                                &product_step_limit_id) == 0) {
                            print_success("Created product step limit value id=%d", product_step_limit_id);

                            if (xdbs_get_product_step_limit_value(product_step_limit_id, &product_limit_value) == 0) {
                                print_success(
                                    "Read product limit %s default=%s value=%s mode=%s",
                                    product_limit_value.limit_name,
                                    product_limit_value.default_limit_value,
                                    product_limit_value.limit_value,
                                    product_limit_value.mode_name);
                            } else {
                                ++failure_count;
                                print_error("Read product step limit value");
                            }

                            if (xdbs_update_product_step_limit_value(
                                    product_step_limit_id,
                                    component_instance_id,
                                    limit_definition_id,
                                    "2.2",
                                    NULL,
                                    NULL,
                                    1,
                                    execution_mode_id) == 0) {
                                print_success("Updated product step limit value");
                            } else {
                                ++failure_count;
                                print_error("Update product step limit value");
                            }

                            if (xdbs_delete_product_step_limit_value(product_step_limit_id) == 0) {
                                product_step_limit_id = 0;
                                print_success("Deleted product step limit value");
                            } else {
                                ++failure_count;
                                print_error("Delete product step limit value");
                            }
                        } else {
                            ++failure_count;
                            print_error("Create product step limit value");
                        }

                        if (xdbs_delete_component_instance(component_instance_id) == 0) {
                            component_instance_id = 0;
                            print_success("Deleted component instance");
                        } else {
                            ++failure_count;
                            print_error("Delete component instance");
                        }
                    } else {
                        ++failure_count;
                        print_error("Create component instance");
                    }

                    if (xdbs_delete_product(limit_product_id) == 0) {
                        created_limit_product = 0;
                        limit_product_id = 0;
                        print_success("Deleted limit test product");
                    } else {
                        ++failure_count;
                        print_error("Delete limit test product");
                    }
                } else {
                    ++failure_count;
                    print_error("Create limit test product");
                }

                if (xdbs_delete_step_limit_definition(limit_definition_id) == 0) {
                    limit_definition_id = 0;
                    print_success("Deleted generic step limit");
                } else {
                    ++failure_count;
                    print_error("Delete generic step limit");
                }
            } else {
                ++failure_count;
                print_error("Create generic step limit");
            }

            if (xdbs_delete_step(limit_step_id) == 0) {
                limit_step_id = 0;
                print_success("Deleted limit test step");
            } else {
                ++failure_count;
                print_error("Delete limit test step");
            }
        } else {
            ++failure_count;
            print_error("Create limit test step");
        }
    }

    print_separator("11. Final Counts");
    {
        XDBS_Product* products = NULL;
        XDBS_Step* steps = NULL;
        XDBS_Sequence* sequences = NULL;
        XDBS_UserInfo* users = NULL;
        XDBS_Role* roles = NULL;
        XDBS_Right* rights = NULL;
        XDBS_HistoryEntry* history = NULL;
        int product_count = 0;
        int step_count = 0;
        int sequence_count = 0;
        int user_count = 0;
        int role_count = 0;
        int right_count = 0;
        int history_count = 0;

        if (xdbs_get_products(&products, &product_count) == 0) {
            print_info("Products : %d", product_count);
            xdbs_free_products(products, product_count);
        } else {
            print_error("Count products");
        }

        if (xdbs_get_steps(&steps, &step_count) == 0) {
            print_info("Steps    : %d", step_count);
            xdbs_free_steps(steps, step_count);
        } else {
            print_error("Count steps");
        }

        if (xdbs_get_sequences(&sequences, &sequence_count) == 0) {
            print_info("Sequences: %d", sequence_count);
            xdbs_free_sequences(sequences, sequence_count);
        } else {
            print_error("Count sequences");
        }

        if (xdbs_get_users(&users, &user_count) == 0) {
            print_info("Users    : %d", user_count);
            xdbs_free_users(users);
        } else {
            print_error("Count users");
        }

        if (xdbs_get_roles(&roles, &role_count) == 0) {
            print_info("Roles    : %d", role_count);
            xdbs_free_roles(roles);
        } else {
            print_error("Count roles");
        }

        if (xdbs_get_rights(&rights, &right_count) == 0) {
            print_info("Rights   : %d", right_count);
            xdbs_free_rights(rights);
        } else {
            print_error("Count rights");
        }

        if (xdbs_get_history(&history, &history_count) == 0) {
            print_info("History  : %d", history_count);
            xdbs_free_history_entries(history);
        } else {
            print_error("Count history");
        }
    }

    print_separator("12. Cleanup");
    if (xdbs_login(admin_username, admin_password) == 0) {
        print_success("Admin session ready for cleanup");
    }

    if (created_pipeline_product && pipeline_product_id > 0) {
        if (xdbs_delete_product(pipeline_product_id) == 0) {
            print_success("Cleanup deleted leftover pipeline product");
        }
    }
    if (product_step_limit_id > 0) {
        xdbs_delete_product_step_limit_value(product_step_limit_id);
    }
    if (component_instance_id > 0) {
        xdbs_delete_component_instance(component_instance_id);
    }
    if (created_limit_product && limit_product_id > 0) {
        xdbs_delete_product(limit_product_id);
    }
    if (limit_definition_id > 0) {
        xdbs_delete_step_limit_definition(limit_definition_id);
    }
    if (limit_step_id > 0) {
        xdbs_delete_step(limit_step_id);
    }
    if (created_pipeline_sequence && pipeline_sequence_id > 0) {
        if (xdbs_delete_sequence(pipeline_sequence_id) == 0) {
            print_success("Cleanup deleted leftover pipeline sequence");
        }
    }
    if (pipeline_pre_step_id > 0) {
        xdbs_delete_step(pipeline_pre_step_id);
    }
    if (pipeline_seq_step_a_id > 0) {
        xdbs_delete_step(pipeline_seq_step_a_id);
    }
    if (pipeline_seq_step_b_id > 0) {
        xdbs_delete_step(pipeline_seq_step_b_id);
    }
    if (pipeline_post_step_id > 0) {
        xdbs_delete_step(pipeline_post_step_id);
    }
    if (created_sequence && sequence_id > 0) {
        xdbs_delete_sequence(sequence_id);
    }
    if (seq_step_a_id > 0) {
        xdbs_delete_step(seq_step_a_id);
    }
    if (seq_step_b_id > 0) {
        xdbs_delete_step(seq_step_b_id);
    }
    if (created_step && step_id > 0) {
        xdbs_delete_step(step_id);
    }
    if (created_product && product_id > 0) {
        xdbs_delete_product(product_id);
    }
    if (created_user) {
        xdbs_delete_user(test_username);
    }
    if (created_role) {
        xdbs_delete_role(test_role_id);
    }
    if (created_right) {
        xdbs_delete_right(test_right_id);
    }

    xdbs_cleanup();
    print_success("Resources released");

    print_separator("Result");
    if (failure_count == 0) {
        print_success("All CRUD integration checks passed");
        return 0;
    }

    print_info("Completed with %d failure(s)", failure_count);
    return 1;
}

