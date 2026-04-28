from pydantic import BaseModel, Field, validator
from typing import Optional
from fastapi import Form, HTTPException
import os

class Neo4jCredentials(BaseModel):
    """
    Neo4j database credentials model with validation.
    Used as a dependency for FastAPI endpoints requiring database access.
    """
    uri: Optional[str] = Field(None, description="Neo4j database URI")
    userName: Optional[str] = Field(None, description="Neo4j username")
    password: Optional[str] = Field(None, description="Neo4j password")
    database: Optional[str] = Field(None, description="Neo4j database name")
    email: Optional[str] = Field(None, description="User email for logging")

    def validate_required(self) -> None:
        """Validate that required credentials are present"""
        if not self.uri or not self.userName or not self.password:
            raise HTTPException(
                status_code=400,
                detail="Missing required credentials: uri, userName, and password are required"
            )

    class Config:
        """Pydantic configuration"""
        str_strip_whitespace = True  # Automatically strip whitespace from strings


async def get_neo4j_credentials(
    uri: Optional[str] = Form(None),
    userName: Optional[str] = Form(None),
    password: Optional[str] = Form(None),
    database: Optional[str] = Form(None),
    email: Optional[str] = Form(None)
) -> Neo4jCredentials:
    """
    FastAPI dependency function to extract and validate Neo4j credentials from form data.
    
    Args:
        uri: Neo4j database URI
        userName: Neo4j username
        password: Neo4j password  
        database: Neo4j database name (optional, defaults to neo4j)
        email: User email for logging purposes
    
    Returns:
        Neo4jCredentials: Validated credentials object
    
    Raises:
        HTTPException: If validation fails
    """
    explorer_mode = os.environ.get("EXPLORER_MODE", "false").strip().lower() == "true"
    if explorer_mode:
        env_uri = os.environ.get("NEO4J_URI")
        env_username = os.environ.get("NEO4J_USERNAME")
        env_password = os.environ.get("NEO4J_PASSWORD")
        env_database = os.environ.get("NEO4J_DATABASE")

        if not env_uri or not env_username or not env_password:
            raise HTTPException(
                status_code=500,
                detail=(
                    "EXPLORER_MODE is enabled but Neo4j credentials are missing in environment. "
                    "Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD and optionally NEO4J_DATABASE."
                ),
            )

        return Neo4jCredentials(
            uri=env_uri,
            userName=env_username,
            password=env_password,
            database=env_database,
            email=email,
        )

    return Neo4jCredentials(uri=uri, userName=userName, password=password, database=database, email=email)
