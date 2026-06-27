"""taste.node — Phase 5 API integration tests."""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine

import src.db as db_module
from src.main import app, _cluster_cache
from src.db import metadata, init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db():
    """Use an on-disk temp SQLite DB for every test so connections share state."""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"
    engine = create_engine(url, connect_args={"check_same_thread": False})
    metadata.create_all(engine)
    old_engine = db_module._engine
    db_module._engine = engine
    yield engine
    _cluster_cache.clear()
    db_module._engine = old_engine
    engine.dispose()
    os.unlink(path)


class TestUsers:
    def test_create_user(self, reset_db):
        resp = client.post("/users", json={"user_id": "alice_42"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["user_id"] == "alice_42"
        assert data["default_context"] == "default"
        assert "default" in data["contexts"]

    def test_create_user_conflict(self, reset_db):
        r1 = client.post("/users", json={"user_id": "alice_42"})
        assert r1.status_code == 201
        r2 = client.post("/users", json={"user_id": "alice_42"})
        assert r2.status_code == 409
        assert r2.json()["detail"]["error"] == "user_exists"

    def test_get_user(self, reset_db):
        client.post("/users", json={"user_id": "alice_42"})
        resp = client.get("/users/alice_42")
        assert resp.status_code == 200
        assert resp.json()["user_id"] == "alice_42"

    def test_get_user_not_found(self, reset_db):
        resp = client.get("/users/bob_99")
        assert resp.status_code == 404
        assert resp.json()["detail"]["error"] == "user_not_found"


class TestContexts:
    def test_upsert_context(self, reset_db):
        client.post("/users", json={"user_id": "alice_42"})
        resp = client.put(
            "/users/alice_42/contexts/default",
            json=[
                {
                    "venue_id": "venue_001",
                    "venue_name": "Golden Bistro",
                    "visited_at": "2025-06-15T19:30:00+00:00",
                    "occasion_tag": "date",
                    "is_classic": True,
                }
            ],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["context_id"] == "default"
        assert len(data["ranked_list"]) == 1
        assert data["ranked_list"][0]["venue"]["id"] == "venue_001"

    def test_upsert_empty_list(self, reset_db):
        client.post("/users", json={"user_id": "alice_42"})
        resp = client.put(
            "/users/alice_42/contexts/default",
            json=[],
        )
        assert resp.status_code == 400

    def test_upsert_missing_venue_id(self, reset_db):
        """FastAPI Pydantic validation returns 422 for missing required fields."""
        client.post("/users", json={"user_id": "alice_42"})
        resp = client.put(
            "/users/alice_42/contexts/default",
            json=[{"visited_at": "2025-06-15T19:30:00+00:00"}],
        )
        assert resp.status_code == 422


class TestSimilarity:
    def test_perfect_correlation(self, reset_db):
        profile = {
            "user_id": "alice",
            "contexts": {
                "default": {
                    "context_id": "default",
                    "ranked_list": [
                        {"venue": {"id": "v1", "name": "A"}, "visited_at": "2025-06-15T19:30:00+00:00"},
                        {"venue": {"id": "v2", "name": "B"}, "visited_at": "2025-06-15T19:30:00+00:00"},
                    ],
                }
            },
            "default_context": "default",
        }
        resp = client.post(
            "/similarity",
            json={"profile_a": profile, "profile_b": profile},
        )
        assert resp.status_code == 200
        assert resp.json()["distance"] == pytest.approx(0.0, abs=1e-9)

    def test_insufficient_overlap(self, reset_db):
        a = {
            "user_id": "alice",
            "contexts": {
                "default": {
                    "context_id": "default",
                    "ranked_list": [
                        {"venue": {"id": "v1", "name": "A"}, "visited_at": "2025-06-15T19:30:00+00:00"},
                    ],
                }
            },
            "default_context": "default",
        }
        b = {
            "user_id": "bob",
            "contexts": {
                "default": {
                    "context_id": "default",
                    "ranked_list": [
                        {"venue": {"id": "v2", "name": "B"}, "visited_at": "2025-06-15T19:30:00+00:00"},
                    ],
                }
            },
            "default_context": "default",
        }
        resp = client.post("/similarity", json={"profile_a": a, "profile_b": b})
        assert resp.status_code == 400
        assert resp.json()["detail"]["error"] == "insufficient_overlap"


class TestClusters:
    def test_recalculate_default(self, reset_db):
        client.post("/users", json={"user_id": "alice"})
        client.put(
            "/users/alice/contexts/default",
            json=[
                {"venue_id": "v1", "visited_at": "2025-06-15T19:30:00+00:00"},
                {"venue_id": "v2", "visited_at": "2025-06-15T19:30:00+00:00"},
            ],
        )
        client.post("/users", json={"user_id": "bob"})
        client.put(
            "/users/bob/contexts/default",
            json=[
                {"venue_id": "v1", "visited_at": "2025-06-15T19:30:00+00:00"},
                {"venue_id": "v2", "visited_at": "2025-06-15T19:30:00+00:00"},
            ],
        )
        resp = client.post("/clusters/recalculate", json={"context_id": "default"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["context_id"] == "default"

    def test_recalculate_missing_context(self, reset_db):
        resp = client.post("/clusters/recalculate", json={})
        assert resp.status_code == 400


class TestRecommendations:
    def test_recommendations_for_user(self, reset_db):
        client.post("/users", json={"user_id": "alice"})
        client.put(
            "/users/alice/contexts/default",
            json=[
                {"venue_id": "venue_000", "visited_at": "2025-06-15T19:30:00+00:00"},
            ],
        )
        resp = client.get("/recommendations?user=alice")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        for rec in data:
            assert "venue" in rec
            assert "score" in rec
            assert "explanation" in rec

    def test_recommendations_user_not_found(self, reset_db):
        resp = client.get("/recommendations?user=ghost")
        assert resp.status_code == 404


class TestVenues:
    def test_list_venues(self, reset_db):
        resp = client.get("/venues")
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)
        assert len(resp.json()) >= 1


class TestErrorShape:
    def test_error_conforms_to_contract(self, reset_db):
        resp = client.get("/users/nobody")
        assert resp.status_code == 404
        err = resp.json()
        assert "detail" in err
        detail = err["detail"]
        assert "error" in detail
        assert "message" in detail


class TestApiKeyGuard:
    def test_mutation_without_key_fails_when_env_is_set(self, reset_db, monkeypatch):
        monkeypatch.setenv("TASTE_NODE_API_KEY", "demo-secret")
        resp = client.post("/users", json={"user_id": "locked_user"})
        assert resp.status_code == 403
        assert resp.json()["detail"]["error"] == "forbidden"

    def test_mutation_with_correct_key_succeeds(self, reset_db, monkeypatch):
        monkeypatch.setenv("TASTE_NODE_API_KEY", "demo-secret")
        resp = client.post(
            "/users",
            json={"user_id": "locked_user"},
            headers={"X-API-Key": "demo-secret"},
        )
        assert resp.status_code == 201

