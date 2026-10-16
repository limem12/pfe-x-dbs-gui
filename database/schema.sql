--
-- PostgreSQL database dump
--

\restrict iOaZ3jhfusWtQnweMZoSRkhcabhoL3kAdTjIZNNhxcJmPgzAqPJV0VXSvSAGR2T

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.history (
    history_id integer NOT NULL,
    user_id integer,
    user_name character varying(45),
    action character varying(20) NOT NULL,
    entity character varying(20) NOT NULL,
    entity_id integer,
    details text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT history_entity_check CHECK (((entity)::text = ANY (ARRAY[('Step'::character varying)::text, ('Sequence'::character varying)::text, ('Produit'::character varying)::text, ('User'::character varying)::text])))
);


--
-- Name: history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.history_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.history_history_id_seq OWNED BY public.history.history_id;


--
-- Name: sequence_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequence_steps (
    fnc_id integer NOT NULL,
    sequence_id integer NOT NULL,
    "position" integer NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    step_id integer NOT NULL,
    status character varying(20)
);


--
-- Name: line_steps_fnc_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.line_steps_fnc_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: line_steps_fnc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.line_steps_fnc_id_seq OWNED BY public.sequence_steps.fnc_id;


--
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    product_id integer NOT NULL
);


--
-- Name: product_counter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_counter (
    product_id integer NOT NULL,
    count integer DEFAULT 0,
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_masters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_masters (
    master_rec_id integer NOT NULL,
    product_id integer NOT NULL,
    master_id integer,
    master character varying(45),
    user_id integer,
    property smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_masters_master_rec_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_masters_master_rec_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_masters_master_rec_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_masters_master_rec_id_seq OWNED BY public.product_masters.master_rec_id;


--
-- Name: product_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_parameters (
    parameter_id integer NOT NULL,
    product_id integer NOT NULL,
    name character varying(45) NOT NULL,
    value character varying(127),
    vtype integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_parameters_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_parameters_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_parameters_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_parameters_parameter_id_seq OWNED BY public.product_parameters.parameter_id;


--
-- Name: product_pipeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_pipeline (
    pipeline_id integer NOT NULL,
    product_id integer NOT NULL,
    zone character varying(10) NOT NULL,
    step_id integer,
    sequence_id integer,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT chk_pipeline_ref CHECK (((((zone)::text = ANY (ARRAY[('PREUUT'::character varying)::text, ('POSTUUT'::character varying)::text])) AND (step_id IS NOT NULL) AND (sequence_id IS NULL)) OR (((zone)::text = 'SEQUENCE'::text) AND (sequence_id IS NOT NULL) AND (step_id IS NULL)))),
    CONSTRAINT product_pipeline_zone_check CHECK (((zone)::text = ANY (ARRAY[('PREUUT'::character varying)::text, ('SEQUENCE'::character varying)::text, ('POSTUUT'::character varying)::text])))
);


--
-- Name: product_pipeline_pipeline_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_pipeline_pipeline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_pipeline_pipeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_pipeline_pipeline_id_seq OWNED BY public.product_pipeline.pipeline_id;


--
-- Name: product_product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_product_id_seq OWNED BY public.product.product_id;


--
-- Name: product_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_status (
    status_id integer NOT NULL,
    tester_id integer,
    product_id integer NOT NULL,
    barcode character varying(45),
    duration double precision,
    failed boolean DEFAULT false,
    mode_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_status_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_status_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_status_status_id_seq OWNED BY public.product_status.status_id;


--
-- Name: product_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_types (
    type_id integer NOT NULL,
    product_id integer NOT NULL,
    name character varying(45) NOT NULL,
    description character varying(255),
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: product_types_type_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_types_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: product_types_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_types_type_id_seq OWNED BY public.product_types.type_id;


--
-- Name: sequence_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequence_parameters (
    parameter_id integer NOT NULL,
    product_id integer NOT NULL,
    fnc_nb integer,
    name character varying(45) NOT NULL,
    value character varying(255),
    user_id integer,
    property smallint DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sequence_parameters_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sequence_parameters_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sequence_parameters_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sequence_parameters_parameter_id_seq OWNED BY public.sequence_parameters.parameter_id;


--
-- Name: sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sequences (
    sequence_id integer NOT NULL,
    name character varying(45) NOT NULL,
    description character varying(255),
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sequences_sequence_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sequences_sequence_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sequences_sequence_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sequences_sequence_id_seq OWNED BY public.sequences.sequence_id;


--
-- Name: status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.status (
    id integer NOT NULL,
    tester_id integer,
    item_id integer,
    terminated boolean DEFAULT false,
    started_at timestamp without time zone DEFAULT now(),
    ended_at timestamp without time zone
);


--
-- Name: status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.status_id_seq OWNED BY public.status.id;


--
-- Name: step_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_parameters (
    parameter_id integer NOT NULL,
    step_id integer,
    name character varying(45) NOT NULL,
    value character varying(127),
    vtype integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: step_parameters_parameter_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_parameters_parameter_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_parameters_parameter_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_parameters_parameter_id_seq OWNED BY public.step_parameters.parameter_id;


--
-- Name: step_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_status (
    status_id integer NOT NULL,
    tester_id integer,
    product_id integer NOT NULL,
    test_id integer,
    parameter_id integer,
    vtype integer,
    dvalue double precision,
    ivalue integer,
    svalue character varying(45),
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: step_status_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.step_status_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: step_status_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.step_status_status_id_seq OWNED BY public.step_status.status_id;


--
-- Name: steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.steps (
    step_id integer NOT NULL,
    name character varying(45) NOT NULL,
    description character varying(255),
    user_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: test_steps_test_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.test_steps_test_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: test_steps_test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.test_steps_test_id_seq OWNED BY public.steps.step_id;


--
-- Name: tester; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tester (
    tester_id integer NOT NULL,
    product_id integer,
    description character varying(255)
);


--
-- Name: tester_tester_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tester_tester_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tester_tester_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tester_tester_id_seq OWNED BY public.tester.tester_id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    user_id integer NOT NULL,
    name character varying(45) NOT NULL,
    role character varying(20) DEFAULT 'Utilisateur'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT user_role_check CHECK (((role)::text = ANY (ARRAY[('Admin'::character varying)::text, ('Utilisateur'::character varying)::text])))
);


--
-- Name: user_parameters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_parameters (
    user_id integer NOT NULL,
    password character varying(255) NOT NULL,
    admin_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: user_rights_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_rights_labels (
    right_id integer NOT NULL,
    user_id integer NOT NULL,
    right_label character varying(50) NOT NULL,
    CONSTRAINT user_rights_labels_right_label_check CHECK (((right_label)::text = ANY (ARRAY[('Voir Data'::character varying)::text, ('Editer Produit'::character varying)::text, ('Editer Step'::character varying)::text, ('Editer Sequence'::character varying)::text, ('Gerer Users'::character varying)::text])))
);


--
-- Name: user_rights_labels_right_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_rights_labels_right_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_rights_labels_right_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_rights_labels_right_id_seq OWNED BY public.user_rights_labels.right_id;


--
-- Name: user_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_user_id_seq OWNED BY public."user".user_id;


--
-- Name: history history_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history ALTER COLUMN history_id SET DEFAULT nextval('public.history_history_id_seq'::regclass);


--
-- Name: product product_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN product_id SET DEFAULT nextval('public.product_product_id_seq'::regclass);


--
-- Name: product_masters master_rec_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_masters ALTER COLUMN master_rec_id SET DEFAULT nextval('public.product_masters_master_rec_id_seq'::regclass);


--
-- Name: product_parameters parameter_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parameters ALTER COLUMN parameter_id SET DEFAULT nextval('public.product_parameters_parameter_id_seq'::regclass);


--
-- Name: product_pipeline pipeline_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline ALTER COLUMN pipeline_id SET DEFAULT nextval('public.product_pipeline_pipeline_id_seq'::regclass);


--
-- Name: product_status status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status ALTER COLUMN status_id SET DEFAULT nextval('public.product_status_status_id_seq'::regclass);


--
-- Name: product_types type_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types ALTER COLUMN type_id SET DEFAULT nextval('public.product_types_type_id_seq'::regclass);


--
-- Name: sequence_parameters parameter_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_parameters ALTER COLUMN parameter_id SET DEFAULT nextval('public.sequence_parameters_parameter_id_seq'::regclass);


--
-- Name: sequence_steps fnc_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps ALTER COLUMN fnc_id SET DEFAULT nextval('public.line_steps_fnc_id_seq'::regclass);


--
-- Name: sequences sequence_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences ALTER COLUMN sequence_id SET DEFAULT nextval('public.sequences_sequence_id_seq'::regclass);


--
-- Name: status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status ALTER COLUMN id SET DEFAULT nextval('public.status_id_seq'::regclass);


--
-- Name: step_parameters parameter_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_parameters ALTER COLUMN parameter_id SET DEFAULT nextval('public.step_parameters_parameter_id_seq'::regclass);


--
-- Name: step_status status_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status ALTER COLUMN status_id SET DEFAULT nextval('public.step_status_status_id_seq'::regclass);


--
-- Name: steps step_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps ALTER COLUMN step_id SET DEFAULT nextval('public.test_steps_test_id_seq'::regclass);


--
-- Name: tester tester_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tester ALTER COLUMN tester_id SET DEFAULT nextval('public.tester_tester_id_seq'::regclass);


--
-- Name: user user_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user" ALTER COLUMN user_id SET DEFAULT nextval('public.user_user_id_seq'::regclass);


--
-- Name: user_rights_labels right_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rights_labels ALTER COLUMN right_id SET DEFAULT nextval('public.user_rights_labels_right_id_seq'::regclass);


--
-- Name: history history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_pkey PRIMARY KEY (history_id);


--
-- Name: sequences line_process_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT line_process_pkey PRIMARY KEY (sequence_id);


--
-- Name: sequence_steps line_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps
    ADD CONSTRAINT line_steps_pkey PRIMARY KEY (fnc_id);


--
-- Name: product_counter product_counter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_counter
    ADD CONSTRAINT product_counter_pkey PRIMARY KEY (product_id);


--
-- Name: product_masters product_masters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_masters
    ADD CONSTRAINT product_masters_pkey PRIMARY KEY (master_rec_id);


--
-- Name: product_parameters product_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parameters
    ADD CONSTRAINT product_parameters_pkey PRIMARY KEY (parameter_id);


--
-- Name: product_pipeline product_pipeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline
    ADD CONSTRAINT product_pipeline_pkey PRIMARY KEY (pipeline_id);


--
-- Name: product_pipeline product_pipeline_product_id_zone_position_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline
    ADD CONSTRAINT product_pipeline_product_id_zone_position_key UNIQUE (product_id, zone, "position");


--
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (product_id);


--
-- Name: product_status product_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status
    ADD CONSTRAINT product_status_pkey PRIMARY KEY (status_id);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (type_id);


--
-- Name: sequence_parameters sequence_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_parameters
    ADD CONSTRAINT sequence_parameters_pkey PRIMARY KEY (parameter_id);


--
-- Name: status status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status
    ADD CONSTRAINT status_pkey PRIMARY KEY (id);


--
-- Name: step_parameters step_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_parameters
    ADD CONSTRAINT step_parameters_pkey PRIMARY KEY (parameter_id);


--
-- Name: step_status step_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status
    ADD CONSTRAINT step_status_pkey PRIMARY KEY (status_id);


--
-- Name: steps steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT steps_pkey PRIMARY KEY (step_id);


--
-- Name: tester tester_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tester
    ADD CONSTRAINT tester_pkey PRIMARY KEY (tester_id);


--
-- Name: user user_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_name_key UNIQUE (name);


--
-- Name: user_parameters user_parameters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_parameters
    ADD CONSTRAINT user_parameters_pkey PRIMARY KEY (user_id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (user_id);


--
-- Name: user_rights_labels user_rights_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rights_labels
    ADD CONSTRAINT user_rights_labels_pkey PRIMARY KEY (right_id);


--
-- Name: user_rights_labels user_rights_labels_user_id_right_label_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rights_labels
    ADD CONSTRAINT user_rights_labels_user_id_right_label_key UNIQUE (user_id, right_label);


--
-- Name: idx_history_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_time ON public.history USING btree (created_at);


--
-- Name: idx_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_user ON public.history USING btree (user_id);


--
-- Name: idx_product_parameters_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_parameters_product ON public.product_parameters USING btree (product_id);


--
-- Name: idx_product_status_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_status_product ON public.product_status USING btree (product_id);


--
-- Name: idx_sequence_parameters_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sequence_parameters_product ON public.sequence_parameters USING btree (product_id);


--
-- Name: idx_step_status_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_status_product ON public.step_status USING btree (product_id);


--
-- Name: sequence_steps fk_line_steps_step; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps
    ADD CONSTRAINT fk_line_steps_step FOREIGN KEY (step_id) REFERENCES public.steps(step_id) ON DELETE CASCADE;


--
-- Name: sequence_steps fk_sequence_steps_step; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps
    ADD CONSTRAINT fk_sequence_steps_step FOREIGN KEY (step_id) REFERENCES public.steps(step_id) ON DELETE CASCADE;


--
-- Name: history history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.history
    ADD CONSTRAINT history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: sequences line_process_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequences
    ADD CONSTRAINT line_process_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: sequence_steps line_steps_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps
    ADD CONSTRAINT line_steps_process_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.sequences(sequence_id) ON DELETE CASCADE;


--
-- Name: sequence_steps line_steps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_steps
    ADD CONSTRAINT line_steps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: product_counter product_counter_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_counter
    ADD CONSTRAINT product_counter_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_masters product_masters_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_masters
    ADD CONSTRAINT product_masters_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_masters product_masters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_masters
    ADD CONSTRAINT product_masters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: product_parameters product_parameters_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parameters
    ADD CONSTRAINT product_parameters_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_parameters product_parameters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_parameters
    ADD CONSTRAINT product_parameters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: product_pipeline product_pipeline_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline
    ADD CONSTRAINT product_pipeline_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_pipeline product_pipeline_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline
    ADD CONSTRAINT product_pipeline_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.sequences(sequence_id) ON DELETE CASCADE;


--
-- Name: product_pipeline product_pipeline_step_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_pipeline
    ADD CONSTRAINT product_pipeline_step_id_fkey FOREIGN KEY (step_id) REFERENCES public.steps(step_id) ON DELETE CASCADE;


--
-- Name: product_status product_status_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status
    ADD CONSTRAINT product_status_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_status product_status_tester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_status
    ADD CONSTRAINT product_status_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public.tester(tester_id) ON DELETE SET NULL;


--
-- Name: product_types product_types_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: product_types product_types_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: sequence_parameters sequence_parameters_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_parameters
    ADD CONSTRAINT sequence_parameters_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: sequence_parameters sequence_parameters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sequence_parameters
    ADD CONSTRAINT sequence_parameters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: status status_tester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.status
    ADD CONSTRAINT status_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public.tester(tester_id) ON DELETE SET NULL;


--
-- Name: step_parameters step_parameters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_parameters
    ADD CONSTRAINT step_parameters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: step_status step_status_parameter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status
    ADD CONSTRAINT step_status_parameter_id_fkey FOREIGN KEY (parameter_id) REFERENCES public.step_parameters(parameter_id) ON DELETE SET NULL;


--
-- Name: step_status step_status_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status
    ADD CONSTRAINT step_status_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE CASCADE;


--
-- Name: step_status step_status_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status
    ADD CONSTRAINT step_status_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.steps(step_id) ON DELETE SET NULL;


--
-- Name: step_status step_status_tester_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_status
    ADD CONSTRAINT step_status_tester_id_fkey FOREIGN KEY (tester_id) REFERENCES public.tester(tester_id) ON DELETE SET NULL;


--
-- Name: steps test_steps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.steps
    ADD CONSTRAINT test_steps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: tester tester_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tester
    ADD CONSTRAINT tester_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(product_id) ON DELETE SET NULL;


--
-- Name: user_parameters user_parameters_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_parameters
    ADD CONSTRAINT user_parameters_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;


--
-- Name: user_parameters user_parameters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_parameters
    ADD CONSTRAINT user_parameters_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Name: user_rights_labels user_rights_labels_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_rights_labels
    ADD CONSTRAINT user_rights_labels_user_id_fkey FOREIGN KEY (user_id) REFERENCES public."user"(user_id) ON DELETE CASCADE;


--
-- Align base schema with the current application model
--

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE public."user" RENAME COLUMN name TO username;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user'
      AND column_name = 'role_name'
  ) THEN
    ALTER TABLE public."user" RENAME COLUMN role TO role_name;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.role (
    role_name character varying(50) PRIMARY KEY,
    description text,
    rights text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

ALTER TABLE public."user"
    ADD COLUMN IF NOT EXISTS password character varying(255),
    ADD COLUMN IF NOT EXISTS email character varying(100),
    ADD COLUMN IF NOT EXISTS phone character varying(20),
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS admin_id integer,
    ADD COLUMN IF NOT EXISTS last_login timestamp without time zone,
    ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT now();

ALTER TABLE public.sequence_steps
    ADD COLUMN IF NOT EXISTS status character varying(20);

ALTER TABLE public."user"
    ALTER COLUMN role_name TYPE character varying(50),
    ALTER COLUMN role_name SET DEFAULT 'Utilisateur',
    ALTER COLUMN is_active SET DEFAULT true,
    ALTER COLUMN updated_at SET DEFAULT now();

UPDATE public."user"
SET
    role_name = COALESCE(role_name, 'Utilisateur'),
    updated_at = COALESCE(updated_at, created_at, now());

ALTER TABLE public."user"
    ALTER COLUMN username SET NOT NULL,
    ALTER COLUMN role_name SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_role_name_fkey'
      AND conrelid = 'public."user"'::regclass
  ) THEN
    ALTER TABLE public."user"
      ADD CONSTRAINT user_role_name_fkey
      FOREIGN KEY (role_name) REFERENCES public.role(role_name);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_admin_id_fkey'
      AND conrelid = 'public."user"'::regclass
  ) THEN
    ALTER TABLE public."user"
      ADD CONSTRAINT user_admin_id_fkey
      FOREIGN KEY (admin_id) REFERENCES public."user"(user_id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'sequence_steps_sequence_id_position_key'
      AND conrelid = 'public.sequence_steps'::regclass
  ) THEN
    ALTER TABLE public.sequence_steps
      ADD CONSTRAINT sequence_steps_sequence_id_position_key
      UNIQUE (sequence_id, "position");
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_sequence_steps_status'
      AND conrelid = 'public.sequence_steps'::regclass
  ) THEN
    ALTER TABLE public.sequence_steps
      ADD CONSTRAINT chk_sequence_steps_status
      CHECK (status IS NULL OR status IN ('activated', 'skipped'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_username ON public."user" (username);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."user" (role_name);
CREATE INDEX IF NOT EXISTS idx_user_email ON public."user" (email);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_status ON public.sequence_steps (status);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_position ON public.sequence_steps ("position");


--
-- PostgreSQL database dump complete
--

\unrestrict iOaZ3jhfusWtQnweMZoSRkhcabhoL3kAdTjIZNNhxcJmPgzAqPJV0VXSvSAGR2T
