#include "x_dbs_api.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef _WIN32
#define xdbs_strcasecmp _stricmp
#else
#include <strings.h>
#define xdbs_strcasecmp strcasecmp
#endif

static const char* getenv_or_default(const char* name, const char* fallback) {
    const char* value = getenv(name);
    return (value && value[0] != '\0') ? value : fallback;
}

static void print_error(const char* action) {
    fprintf(stderr, "[ERREUR] %s : %s\n", action, xdbs_get_last_error());
}

static XDBS_Product* find_product(
    XDBS_Product* products,
    int product_count,
    const char* expected_name
) {
    int index;

    for (index = 0; index < product_count; ++index) {
        if (xdbs_strcasecmp(products[index].name, expected_name) == 0) {
            return &products[index];
        }
    }

    return product_count > 0 ? &products[0] : NULL;
}

static const char* find_sequence_name(
    const XDBS_Sequence* sequences,
    int sequence_count,
    int sequence_id
) {
    int index;

    for (index = 0; index < sequence_count; ++index) {
        if (sequences[index].id == sequence_id) {
            return sequences[index].name;
        }
    }

    return "sequence inconnue";
}

int main(int argc, char** argv) {
    const char* api_url = getenv_or_default("XDBS_API_URL", "http://localhost:3002/api");
    const char* username = getenv_or_default("XDBS_USERNAME", "Admin");
    const char* password = getenv("XDBS_PASSWORD");
    const char* product_name = getenv_or_default("XDBS_DEMO_PRODUCT", "DEMO - ECU 12V");
    XDBS_Product* products = NULL;
    XDBS_Step* steps = NULL;
    XDBS_Sequence* sequences = NULL;
    XDBS_ExecutionMode* modes = NULL;
    XDBS_HistoryEntry* history = NULL;
    XDBS_Product* selected_product = NULL;
    int product_count = 0;
    int step_count = 0;
    int sequence_count = 0;
    int mode_count = 0;
    int history_count = 0;
    int index;
    int exit_code = 1;

    if (argc >= 3) {
        username = argv[1];
        password = argv[2];
    }
    if (argc >= 4) {
        api_url = argv[3];
    }
    if (argc >= 5) {
        product_name = argv[4];
    }

    if (!password || password[0] == '\0') {
        fprintf(stderr, "Definir XDBS_PASSWORD avant l'execution.\n");
        return 1;
    }

    printf("============================================================\n");
    printf(" X-DBS GUI - Lecture ATP via le wrapper C\n");
    printf("============================================================\n");
    printf("API       : %s\n", api_url);
    printf("Utilisateur: %s\n", username);
    printf("Produit   : %s\n\n", product_name);

    if (xdbs_init(api_url) != 0) {
        print_error("Initialisation du client");
        return 1;
    }

    if (xdbs_login(username, password) != 0) {
        print_error("Authentification JWT");
        goto cleanup;
    }
    printf("[OK] Authentification JWT reussie\n");

    if (xdbs_get_products(&products, &product_count) != 0) {
        print_error("Lecture des produits");
        goto cleanup;
    }
    if (xdbs_get_steps(&steps, &step_count) != 0) {
        print_error("Lecture des steps");
        goto cleanup;
    }
    if (xdbs_get_sequences(&sequences, &sequence_count) != 0) {
        print_error("Lecture des sequences");
        goto cleanup;
    }
    if (xdbs_get_execution_modes(&modes, &mode_count) != 0) {
        print_error("Lecture des modes d'execution");
        goto cleanup;
    }

    printf("[OK] Ressources lues depuis l'API\n");
    printf("     Produits : %d\n", product_count);
    printf("     Steps    : %d\n", step_count);
    printf("     Sequences: %d\n", sequence_count);
    printf("     Modes    : %d\n\n", mode_count);

    selected_product = find_product(products, product_count, product_name);
    if (!selected_product) {
        fprintf(stderr, "[ERREUR] Aucun produit disponible.\n");
        goto cleanup;
    }

    printf("[PRODUIT] #%d - %s\n", selected_product->id, selected_product->name);
    printf("          %s\n", selected_product->description);
    printf("          PREUUT=%d | SEQUENCES=%d | POSTUUT=%d\n",
        selected_product->preuut_step_count,
        selected_product->sequence_count,
        selected_product->postuut_step_count);

    for (index = 0; index < selected_product->param_count; ++index) {
        printf("          Parametre %s (%s) = %s\n",
            selected_product->params[index].name,
            selected_product->params[index].type,
            selected_product->params[index].value);
    }

    for (index = 0; index < selected_product->sequence_count; ++index) {
        int sequence_id = selected_product->sequence_ids[index];
        printf("          Sequence #%d : %s\n",
            sequence_id,
            find_sequence_name(sequences, sequence_count, sequence_id));
    }

    if (mode_count > 0) {
        printf("\n[MODES] ");
        for (index = 0; index < mode_count; ++index) {
            printf("%s%s", index == 0 ? "" : ", ", modes[index].name);
        }
        printf("\n");
    }

    if (xdbs_get_history(&history, &history_count) == 0) {
        int visible_count = history_count < 3 ? history_count : 3;
        printf("\n[AUDIT] %d entree(s), %d plus recente(s) affichee(s)\n",
            history_count,
            visible_count);
        for (index = 0; index < visible_count; ++index) {
            printf("        - %s | %s | %s\n",
                history[index].user_name,
                history[index].action,
                history[index].entity);
        }
    } else {
        printf("\n[INFO] Historique non affiche : %s\n", xdbs_get_last_error());
    }

    printf("\n[OK] Le programme C consomme la meme configuration que l'interface web.\n");
    exit_code = 0;

cleanup:
    xdbs_free_products(products, product_count);
    xdbs_free_steps(steps, step_count);
    xdbs_free_sequences(sequences, sequence_count);
    xdbs_free_execution_modes(modes, mode_count);
    xdbs_free_history_entries(history);
    xdbs_cleanup();
    return exit_code;
}

