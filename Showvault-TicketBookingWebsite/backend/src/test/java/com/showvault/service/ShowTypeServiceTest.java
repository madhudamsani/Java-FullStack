package com.showvault.service;

import com.showvault.model.ShowType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class ShowTypeServiceTest {

    @InjectMocks
    private ShowTypeService showTypeService;

    @Test
    void testGetAllShowTypes() {
        List<String> types = showTypeService.getAllShowTypes();
        
        assertNotNull(types);
        assertEquals(5, types.size());
        assertTrue(types.contains("Movie"));
        assertTrue(types.contains("Theatrical"));
        assertTrue(types.contains("Concert"));
        assertTrue(types.contains("Event"));
        assertTrue(types.contains("Other"));
    }

    @Test
    void testNormalizeShowType_Theater() {
        // Test backward compatibility: Theater -> Theatrical
        String result = showTypeService.normalizeShowType("Theater");
        assertEquals("Theatrical", result);
    }

    @Test
    void testNormalizeShowType_Theatrical() {
        // Test that Theatrical remains Theatrical
        String result = showTypeService.normalizeShowType("Theatrical");
        assertEquals("Theatrical", result);
    }

    @Test
    void testNormalizeShowType_Movie() {
        String result = showTypeService.normalizeShowType("Movie");
        assertEquals("Movie", result);
    }

    @Test
    void testNormalizeShowType_Concert() {
        String result = showTypeService.normalizeShowType("Concert");
        assertEquals("Concert", result);
    }

    @Test
    void testNormalizeShowType_Event() {
        String result = showTypeService.normalizeShowType("Event");
        assertEquals("Event", result);
    }

    @Test
    void testNormalizeShowType_Other() {
        String result = showTypeService.normalizeShowType("Other");
        assertEquals("Other", result);
    }

    @Test
    void testNormalizeShowType_Invalid() {
        String result = showTypeService.normalizeShowType("InvalidType");
        assertEquals("Other", result);
    }

    @Test
    void testNormalizeShowType_Null() {
        String result = showTypeService.normalizeShowType(null);
        assertEquals("Other", result);
    }

    @Test
    void testNormalizeShowType_CaseInsensitive() {
        assertEquals("Theatrical", showTypeService.normalizeShowType("theater"));
        assertEquals("Theatrical", showTypeService.normalizeShowType("THEATER"));
        assertEquals("Theatrical", showTypeService.normalizeShowType("ThEaTeR"));
        assertEquals("Movie", showTypeService.normalizeShowType("movie"));
        assertEquals("Movie", showTypeService.normalizeShowType("MOVIE"));
    }

    @Test
    void testIsValidShowType() {
        assertTrue(showTypeService.isValidShowType("Movie"));
        assertTrue(showTypeService.isValidShowType("Theatrical"));
        assertTrue(showTypeService.isValidShowType("Theater")); // Backward compatibility
        assertTrue(showTypeService.isValidShowType("Concert"));
        assertTrue(showTypeService.isValidShowType("Event"));
        assertTrue(showTypeService.isValidShowType("Other"));
        
        assertFalse(showTypeService.isValidShowType("InvalidType"));
        assertFalse(showTypeService.isValidShowType(""));
        assertFalse(showTypeService.isValidShowType(null));
    }

    @Test
    void testGetFrontendType() {
        assertEquals("Theatrical", showTypeService.getFrontendType("Theater"));
        assertEquals("Theatrical", showTypeService.getFrontendType("Theatrical"));
        assertEquals("Movie", showTypeService.getFrontendType("Movie"));
        assertEquals("Concert", showTypeService.getFrontendType("Concert"));
        assertEquals("Event", showTypeService.getFrontendType("Event"));
        assertEquals("Other", showTypeService.getFrontendType("Other"));
    }

    @Test
    void testGetDatabaseType() {
        assertEquals("Theatrical", showTypeService.getDatabaseType("Theater"));
        assertEquals("Theatrical", showTypeService.getDatabaseType("Theatrical"));
        assertEquals("Movie", showTypeService.getDatabaseType("Movie"));
        assertEquals("Concert", showTypeService.getDatabaseType("Concert"));
        assertEquals("Event", showTypeService.getDatabaseType("Event"));
        assertEquals("Other", showTypeService.getDatabaseType("Other"));
    }
}