from app.ai.prompt_builder import sanitize_prompt, get_analysis_prompt, build_generation_prompt, build_refinement_prompt

def test_sanitize_prompt():
    # Long prompt truncation
    long_text = "a" * 2500
    sanitized = sanitize_prompt(long_text)
    assert len(sanitized) == 2000
    
    # Whitespace normalization
    text_with_spaces = "  hello   world  \n  new   line "
    assert sanitize_prompt(text_with_spaces) == "hello world new line"
    
    # Control character stripping
    text_with_control = "hello\x00world\x1f!"
    assert sanitize_prompt(text_with_control) == "helloworld!"

def test_get_analysis_prompt():
    prompt = get_analysis_prompt("bohemian")
    assert "bohemian" in prompt.lower()
    assert "interior designer" in prompt.lower()

def test_build_generation_prompt():
    prompt = build_generation_prompt("Redesign room")
    assert "Redesign room" in prompt
    assert "Keep the room's structural layout unchanged" in prompt

def test_build_refinement_prompt():
    prompt = build_refinement_prompt("Make sofa blue")
    assert "Make sofa blue" in prompt
    assert "Apply this change only" in prompt
